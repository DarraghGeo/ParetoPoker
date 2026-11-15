// Data for the strength-ladder mock-up: three real decisions of one solved spot, each with both ranges laid out on the
// board's own scale of hands (the best at the top; high card split into draws and trash), how much of each range is at
// each level, what the range to act does there, and the hands that make it up.
import { writeFileSync } from 'node:fs';
import * as fs from 'poker-flopsolve';
import { treeOf, equityVs } from '../../src/solver/flopsolve.js';
import { PRESETS } from '../../web/lib/study/presets.js';
import { study } from '../../src/explain/street.js';

const p = PRESETS.find((x) => x.action === 'SRP' && x.oop === 'BB' && x.ip === 'BU'); const BOARD = 'Ks9d4s7h'; const RIVER = '2c'; const N = fs.COMBOS;
const spot = fs.defineSpot({ board: BOARD, pot: p.pot, stack: p.stack, oop: p.ranges.oop, ip: p.ranges.ip, betSizes: [[0.75], [0.75]], raiseSizes: [{ times: 3 }], maxRaises: 2 });
const run = fs.createRun(spot, { workers: 4 }); let ex = 9; while (ex > 0.1 && run.completed < 3000) { run.step(10); ex = run.exploitabilityPercent(); } const solution = run.snapshot(); const nodes = treeOf(fs, spot); console.error('solved', ex.toFixed(2));
const river = fs.parseCards(RIVER)[0]; const r3 = (x) => +x.toFixed(3); const RANKS = '23456789TJQKA';
const className = (c) => { const a = fs.rankOf(fs.COMBO_CARDS[2 * c]), b = fs.rankOf(fs.COMBO_CARDS[2 * c + 1]); const s = fs.suitOf(fs.COMBO_CARDS[2 * c]) === fs.suitOf(fs.COMBO_CARDS[2 * c + 1]); return `${RANKS[Math.max(a, b)]}${RANKS[Math.min(a, b)]}${a === b ? '' : s ? 's' : 'o'}`; };
const LEVELS = ['Full house +', 'Flush', 'Straight', 'Set / trips', 'Two pair', 'Overpair', 'Top pair', 'Middle pair', 'Low pair', 'Draws', 'Trash'];
/** The level a hand sits at: what it has made with its own cards; with no pair of its own, a draw (four outs or more) or trash. */
function levelOf(x) {
  if (x.own >= 1 && x.made >= 6) return 0; if (x.own >= 1 && x.made === 5) return 1; if (x.own >= 1 && x.made === 4) return 2; if (x.own >= 1 && x.made === 3) return 3; if (x.own >= 1 && x.made === 2 && x.own >= 2) return 4;
  if (x.pair === 'overpair') return 5; if (x.pair === 'top pair') return 6; if (x.pair === 'middle pair') return 7; if (x.pair === 'bottom pair' || x.pair === 'underpair' || x.own >= 1) return 8;
  return x.draw ? 9 : 10;
}
function laid(st, range, eq, sigma, kinds) {
  const L = LEVELS.map(() => ({ w: 0, e: 0, mix: kinds ? kinds.map(() => 0) : null, by: new Map(), draws: 0 })); let total = 0;
  for (let c = 0; c < N; c++) { const w = range[c]; if (!(w > 1e-6) || Number.isNaN(eq[c])) continue; const x = st.featuresOf(c); const g = L[levelOf(x)]; g.w += w; g.e += w * eq[c]; total += w; if (x.draw && levelOf(x) < 9) g.draws += w;
    if (kinds) kinds.forEach((_, a) => { g.mix[a] += w * sigma(c, a); }); g.by.set(className(c), (g.by.get(className(c)) ?? 0) + w); }
  return L.map((g) => ({ share: r3(g.w / total), eq: g.w > 0 ? r3(g.e / g.w) : null, mix: g.mix && g.w > 0 ? g.mix.map((x) => r3(x / g.w)) : null, draws: g.w > 0 ? r3(g.draws / g.w) : 0, hands: [...g.by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([n]) => n) }));
}
const follow = (id, labels) => { let at = id; for (const l of labels) { let n = nodes[at]; if (n.kind === 'chance') { at = n.edges[0].child; n = nodes[at]; } at = n.edges.find((x) => x.label === l).child; } if (nodes[at].kind === 'chance') at = nodes[at].edges[0].child; return at; };
function decision(id, dealt, title, who, stands, history) {
  const st = study(fs, solution, nodes, id, dealt); const f = st.f; const n = nodes[id]; const kinds = n.edges.map((e) => e.kind); const eq = st.equity(); const hisEq = equityVs(fs, f.board, f.his, f.mine);
  const mine = laid(st, f.mine, eq, (c, a) => st.sigma(c, a), kinds); const his = laid(st, f.his, hisEq, null, null); const facing = st.toCall > 0; const me = f.me;
  const sum = (range, e) => { let w = 0, t = 0; for (let c = 0; c < N; c++) if (range[c] > 1e-6 && !Number.isNaN(e[c])) { w += range[c]; t += range[c] * e[c]; } return t / w; };
  const bet = n.edges.find((e) => e.kind === 'bet'); const s = bet ? (nodes[bet.child].invested[me] - n.invested[me]) / n.pot : 0;
  return { title, who, stands, history, facing, board: fs.formatCards(f.board), actions: st.actions.map((a) => ({ label: a.label, kind: a.kind, freq: r3(a.freq) })), equity: [r3(sum(f.mine, eq)), r3(sum(f.his, hisEq))],
    bet: r3(s), price: facing ? r3(st.toCall / (st.pot + st.toCall)) : null, mine, his, levels: LEVELS };
}
const turnIP = nodes[0].edges.find((e) => e.kind === 'check').child; const riverFirst = follow(0, ['X', 'X']); const riverFacing = nodes[riverFirst].edges.find((e) => e.kind === 'bet').child;
const data = [
  decision(turnIP, [], 'Turn', 'BU', 'Checked to you', [['Turn', [['BB', 'X']]]]),
  decision(riverFirst, [river], 'River', 'BB', 'First to act', [['Turn', [['BB', 'X'], ['BU', 'X']]]]),
  decision(riverFacing, [river], 'River, facing a bet', 'BU', 'Facing B75', [['Turn', [['BB', 'X'], ['BU', 'X']]], ['River', [['BB', 'B75']]]]),
];
writeFileSync(new URL('./strength.json', import.meta.url), JSON.stringify(data));
for (const d of data) { console.error(d.title, d.board, d.actions.map((a) => `${a.label} ${a.freq}`).join(' '), 'eq', d.equity); d.levels.forEach((l, i) => console.error(`   ${l.padEnd(13)} me ${String(d.mine[i].share).padEnd(6)} ${(d.mine[i].mix ?? []).join('/').padEnd(18)} e ${d.mine[i].eq}  him ${String(d.his[i].share).padEnd(6)} ${d.mine[i].hands.slice(0, 3).join(' ')} | ${d.his[i].hands.slice(0, 3).join(' ')}`)); }
