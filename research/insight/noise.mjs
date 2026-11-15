// How settled is a range's frequency at the accuracy the spots were solved to? The same spots solved to 0.3% (as collected)
// and far finer, by two algorithms: the difference in how often the range bets, folds and raises at each decision.
import { fs } from '../proof/lib.mjs';
import { treeOf } from '../../src/solver/flopsolve.js';
import { PRESETS } from '../../web/lib/study/presets.js';
import { study } from '../../src/explain/street.js';
const TREE = { betSizes: [[0.33, 0.75, 1.25], [0.75], [0.75]], raiseSizes: [{ times: 3 }], maxRaises: [2, 1, 1], allInThreshold: 0.67 };
const spots = [['4BP-BB-BU', 'Kh7d2c'], ['4BP-CO-BU', '9s8s4d'], ['4BP-SB-BU', 'QcJd5h'], ['Squeeze-SB-CO', 'Ah8d3d'], ['4BP-UTG-BU', '7c6c2h'], ['4BP-HJ-CO', 'KsQd9c']];
const diffs = { bet: [], fold: [], raise: [], tbet: [] };
for (const [key, board] of spots) {
  const p = PRESETS.find((x) => `${x.action}-${x.oop}-${x.ip}` === key); const spot = fs.defineSpot({ board, pot: p.pot, stack: p.stack, oop: p.ranges.oop, ip: p.ranges.ip, ...TREE }); const nodes = treeOf(fs, spot);
  const solve = (target, algorithm) => { const run = fs.createRun(spot, { workers: 2, algorithm }); let e = 9; while (e > target && run.completed < 4000) { run.step(10); e = run.exploitabilityPercent(); } return { sol: run.snapshot(), e }; };
  const read = (sol) => {
    const out = {}; const check = nodes[0].edges.find((x) => x.kind === 'check').child; const freq = (id, dealt, pick) => { const st = study(fs, sol, nodes, id, dealt); return st ? st.actions.reduce((t, a) => t + (pick(a.kind) ? a.freq : 0), 0) : null; };
    const isBet = (k) => k === 'bet' || k === 'allin';
    out['bet first'] = freq(0, [], isBet); out['bet x'] = freq(check, [], isBet);
    for (const [from, tag] of [[0, 'b'], [check, 'xb']]) nodes[from].edges.forEach((ed, i) => { if (ed.kind === 'bet' && nodes[ed.child].kind === 'decision') { out[`fold ${tag}${i}`] = freq(ed.child, [], (k) => k === 'fold'); out[`raise ${tag}${i}`] = freq(ed.child, [], (k) => k === 'raise' || k === 'allin'); out[`w ${tag}${i}`] = study(fs, sol, nodes, from, []).actions[i].freq; } });
    const cc = nodes[check].edges.find((x) => x.kind === 'check'); const turn = nodes[cc.child].edges[0].child; const free = []; for (let c = 0; c < 52; c++) if (!spot.board.includes(c)) free.push(c);
    for (const c of [free[3], free[17], free[30], free[44]]) { out[`tbet first ${c}`] = freq(turn, [c], isBet); const tx = nodes[turn].edges.find((x) => x.kind === 'check').child; out[`tbet x ${c}`] = freq(tx, [c], isBet); }
    return out;
  };
  const a = solve(0.3, 'dcfr'); const b = solve(0.03, 'dcfr'); const c = solve(0.03, 'cfr+'); const A = read(a.sol), B = read(b.sol), C = read(c.sol);
  for (const k of Object.keys(A)) { if (k.startsWith('w ') || A[k] == null) continue; const kind = k.split(' ')[0]; if ((kind === 'fold' || kind === 'raise') && (B[`w ${k.split(' ')[1]}`] ?? 1) < 0.08) continue; diffs[kind].push([Math.abs(A[k] - B[k]), Math.abs(B[k] - C[k])]); }
  console.log(key, board, `solved to ${a.e.toFixed(3)} / ${b.e.toFixed(3)} / ${c.e.toFixed(3)}`, 'bet first', A['bet first'].toFixed(3), B['bet first'].toFixed(3), C['bet first'].toFixed(3), '| bet x', A['bet x'].toFixed(3), B['bet x'].toFixed(3), C['bet x'].toFixed(3));
}
const mean = (v) => v.reduce((t, x) => t + x, 0) / Math.max(1, v.length);
for (const [k, v] of Object.entries(diffs)) console.log(`${k}: ${v.length} frequencies. 0.3% against fine: mean ${mean(v.map((x) => x[0])).toFixed(3)}, largest ${Math.max(...v.map((x) => x[0])).toFixed(3)}. Fine against fine by the other algorithm: mean ${mean(v.map((x) => x[1])).toFixed(3)}, largest ${Math.max(...v.map((x) => x[1])).toFixed(3)}`);
