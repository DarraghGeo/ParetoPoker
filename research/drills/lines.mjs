// Data for the "place the lines" mock-up: three real decisions of one solved spot, each as 60 slices of the range to act
// (weakest first) with what the slice mostly does, a hand from it, and what each choice would give up there against the
// solution (the mean over its hands of the solution's value less the action's value, in % of the pot).
import { writeFileSync } from 'node:fs';
import * as fs from 'poker-flopsolve';
import { treeOf } from '../../src/solver/flopsolve.js';
import { PRESETS } from '../../web/lib/study/presets.js';
import { study } from '../../src/explain/street.js';

const p = PRESETS.find((x) => x.action === 'SRP' && x.oop === 'BB' && x.ip === 'BU'); const BOARD = 'Ks9d4s7h'; const RIVER = '2c'; const B = 60; const N = fs.COMBOS;
const spot = fs.defineSpot({ board: BOARD, pot: p.pot, stack: p.stack, oop: p.ranges.oop, ip: p.ranges.ip, betSizes: [[0.75], [0.75]], raiseSizes: [{ times: 3 }], maxRaises: 2 });
const run = fs.createRun(spot, { workers: 4 }); let ex = 9; while (ex > 0.1 && run.completed < 3000) { run.step(10); ex = run.exploitabilityPercent(); } const solution = run.snapshot(); const nodes = treeOf(fs, spot); console.error('solved', ex.toFixed(2));
const river = fs.parseCards(RIVER)[0]; const r3 = (x) => +x.toFixed(3); const GLYPH = { s: '♠', h: '♥', d: '♦', c: '♣' }; const pretty = (h) => h.replace(/[shdc]/g, (s) => GLYPH[s]);
const follow = (id, labels) => { let at = id; for (const l of labels) { let n = nodes[at]; if (n.kind === 'chance') { at = n.edges[0].child; n = nodes[at]; } const e = n.edges.find((x) => x.label === l); if (!e) throw new Error(`no ${l} at ${at}: ${n.edges.map((x) => x.label)}`); at = e.child; } if (nodes[at].kind === 'chance') at = nodes[at].edges[0].child; return at; };

function decision(id, dealt, title, context, facing) {
  const st = study(fs, solution, nodes, id, dealt); const f = st.f; const eq = st.equity(); const n = nodes[id]; const kinds = n.edges.map((e) => e.kind);
  const quiet = kinds.indexOf(facing ? 'fold' : 'check'); const louds = kinds.map((k, a) => a).filter((a) => a !== quiet && kinds[a] !== 'raise' && kinds[a] !== 'allin');
  const freq = st.actions.map((a) => a.freq); const loud = louds.reduce((b, a) => (freq[a] > freq[b] ? a : b)); const vals = n.edges.map((_, a) => st.closely(a).value);
  const hs = []; for (let c = 0; c < N; c++) if (f.mine[c] > 1e-6 && !Number.isNaN(eq[c]) && !Number.isNaN(vals[quiet][c]) && !Number.isNaN(vals[loud][c])) hs.push(c); hs.sort((x, y) => eq[x] - eq[y]);
  const total = hs.reduce((t, c) => t + f.mine[c], 0); const slices = Array.from({ length: B }, () => ({ w: 0, loud: 0, costQuiet: 0, costLoud: 0, e: 0, top: null, topW: 0, outs: 0 })); let seen = 0;
  for (const c of hs) {
    const w = f.mine[c]; const s = slices[Math.min(B - 1, Math.floor((B * (seen + w / 2)) / total))]; seen += w; const mine = n.edges.reduce((t, _, a) => t + st.sigma(c, a) * vals[a][c], 0);
    s.w += w; s.e += w * eq[c]; s.loud += w * n.edges.reduce((t, _, a) => t + (a !== quiet ? st.sigma(c, a) : 0), 0); s.costQuiet += w * (mine - vals[quiet][c]); s.costLoud += w * (mine - vals[loud][c]);
    const x = st.featuresOf(c); s.outs += w * (f.board.length < 5 && x.flushOuts + x.straightOuts >= 8 ? 1 : 0); if (w > s.topW) { s.topW = w; s.top = pretty(fs.formatCombo(c)); }
  }
  const pot = st.pot; const out = slices.map((s) => (s.w > 0 ? { loud: r3(s.loud / s.w), e: r3(s.e / s.w), q: r3((100 * s.costQuiet) / s.w / pot), l: r3((100 * s.costLoud) / s.w / pot), ex: s.top, draw: r3(s.outs / s.w) } : null));
  for (let i = 0; i < B; i++) if (!out[i]) out[i] = out[i - 1] ?? out.find(Boolean);
  return { title, context, facing, board: fs.formatCards(f.board), labels: [n.edges[quiet].label, n.edges[loud].label], share: r3(hs.reduce((t, c) => t + f.mine[c] * n.edges.reduce((u, _, a) => u + (a !== quiet ? st.sigma(c, a) : 0), 0), 0) / total), price: facing ? r3(st.toCall / (st.pot + st.toCall)) : null, slices: out };
}
const riverFirst = follow(0, ['X', 'X']); const bet = nodes[riverFirst].edges.find((e) => e.kind === 'bet'); const riverFacing = bet.child;
const data = [
  decision(riverFirst, [river], 'River, first to act', 'Turn checked through. You are BB, first to act.', false),
  decision(riverFacing, [river], 'River, facing a bet', `Turn checked through. BB bets ${bet.label.slice(1)}% of the pot. You are BU.`, true),
  decision(nodes[0].edges.find((e) => e.kind === 'check').child, [], 'Turn, checked to you', 'BB checks the turn. You are BU.', false),
];
writeFileSync(new URL('./lines.json', import.meta.url), JSON.stringify(data));
for (const d of data) console.error(d.title, d.board, d.labels, 'share', d.share, 'price', d.price, '|', d.slices.map((s) => Math.round(10 * s.loud)).join(''));
