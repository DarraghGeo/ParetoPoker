// Data for the revamped-app mock-up: two real decisions of one solved spot (single-raised pot, BB against BU, Ks 9d 4s 7h
// then 2c), every hand class of the player to act with its equity against his range and what the solution does with it.
import { writeFileSync } from 'node:fs';
import * as fs from 'poker-flopsolve';
import { treeOf, equityVs } from '../../src/solver/flopsolve.js';
import { PRESETS } from '../../web/lib/study/presets.js';
import { study } from '../../src/explain/street.js';
import { facts } from '../rules/facts.mjs';
const p = PRESETS.find((x) => x.action === 'SRP' && x.oop === 'BB' && x.ip === 'BU'); const N = fs.COMBOS; const r3 = (x) => +x.toFixed(3); const RANKS = '23456789TJQKA';
const spot = fs.defineSpot({ board: 'Ks9d4s7h', pot: p.pot, stack: p.stack, oop: p.ranges.oop, ip: p.ranges.ip, betSizes: [[0.33], [0.75]], raiseSizes: [{ times: 3 }], maxRaises: 1 });
const run = fs.createRun(spot, { workers: 4 }); let ex = 9; while (ex > 0.1 && run.completed < 3000) { run.step(10); ex = run.exploitabilityPercent(); } const solution = run.snapshot(); const nodes = treeOf(fs, spot); console.error('solved', ex.toFixed(2));
const cls = (c) => { const a = fs.rankOf(fs.COMBO_CARDS[2 * c]), b = fs.rankOf(fs.COMBO_CARDS[2 * c + 1]); const s = fs.suitOf(fs.COMBO_CARDS[2 * c]) === fs.suitOf(fs.COMBO_CARDS[2 * c + 1]); return `${RANKS[Math.max(a, b)]}${RANKS[Math.min(a, b)]}${a === b ? '' : s ? 's' : 'o'}`; };
const step = (id, kind) => { let n = nodes[id]; if (n.kind === 'chance') n = nodes[n.edges[0].child]; let to = n.edges.find((e) => e.kind === kind).child; if (nodes[to].kind === 'chance') to = nodes[to].edges[0].child; return to; };
function decision(id, dealt, title, who, line) {
  const st = study(fs, solution, nodes, id, dealt); const f = st.f; const n = nodes[id]; const kinds = n.edges.map((e) => e.kind); const eq = st.equity(); const hisEq = equityVs(fs, f.board, f.his, f.mine); const F = facts(Array.from(f.board));
  const by = new Map(); let tot = 0; for (let c = 0; c < N; c++) { const w = f.mine[c]; if (!(w > 1e-6) || Number.isNaN(eq[c])) continue; const k = `${cls(c)}|${F.lv[c]}|${F.come[c] >= 8 ? 1 : 0}`; let g = by.get(k); if (!g) by.set(k, g = { cls: cls(c), lv: F.lv[c], draw: F.come[c] >= 8, w: 0, e: 0, mix: kinds.map(() => 0), ex: c, exW: 0 }); g.w += w; g.e += w * eq[c]; tot += w; kinds.forEach((_, a) => { g.mix[a] += w * st.sigma(c, a); }); if (w > g.exW) { g.exW = w; g.ex = c; } }
  const his = Array(8).fill(0); const hisE = Array(20).fill(0); let ht = 0; for (let v = 0; v < N; v++) { const w = f.his[v]; if (!(w > 1e-6) || Number.isNaN(hisEq[v]) || F.lv[v] < 0) continue; his[F.lv[v]] += w; hisE[Math.min(19, Math.floor(20 * hisEq[v]))] += w; ht += w; }
  const toCall = st.toCall; const faced = toCall > 0 ? toCall / (st.pot - toCall) : 0;
  return { title, who, line, board: fs.formatCards(f.board), seat: f.me ? 'in position' : 'out of position', street: f.board.length, faced: r3(faced), price: r3(faced / (1 + 2 * faced)), kinds, labels: n.edges.map((e) => e.label),
    hands: [...by.values()].map((g) => ({ cls: g.cls, ex: fs.formatCombo(g.ex), lv: g.lv, draw: g.draw, w: r3(g.w / tot), e: r3(g.e / g.w), mix: g.mix.map((m) => r3(m / g.w)) })).sort((a, b) => b.e - a.e), his: his.map((x) => r3(x / ht)), hisE: hisE.map((x) => r3(x / ht)) };
}
const turnIp = step(0, 'check'); const riverRoot = step(turnIp, 'check'); const river = fs.parseCards('2c')[0]; const riverFacing = step(riverRoot, 'bet');
writeFileSync(new URL('./data.json', import.meta.url), JSON.stringify([decision(turnIp, [], 'Turn', 'BU', 'BB checks to you'), decision(riverFacing, [river], 'River', 'BU', 'Turn checked through. BB bets three quarters of the pot')]));
