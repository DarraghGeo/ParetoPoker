// PROOF 4. The best-reply walk is right.
//   (a) in 'average' mode it reproduces the solver's own values for every hand and action;
//   (b) in 'best' mode, at the first decision, the best-reply value of the whole game agrees with the
//       solver's own best-response traversal (the one its exploitability is computed from);
//   (c) a best reply is never worth less than the solved strategy, for any hand or action.
import { fs, solveSpot, decisions } from './lib.mjs';
import { TURNS, FLOPS } from './spots.mjs';
import { frameAt, actionValues } from '../../src/explain/account.js';
import { evaluator } from '../../src/explain/best.js';
const only = process.argv[2];
const spots = [...TURNS.map((s) => ({ ...s, target: 0.3 })), ...FLOPS.map((s) => ({ ...s, target: 1.5 }))].filter((s) => !only || s.name.includes(only));
for (const s of spots) {
  const g = solveSpot(s, s.target); const valuesOf = evaluator(fs, g.solution, g.nodes); const pot0 = g.nodes[0].pot;
  const worst = { average: 0, order: 0, root: 0 }; const count = { decisions: 0, values: 0 }; const first = g.spot.board.length; const t0 = Date.now();
  const budget = first === 3 ? [1, 4, 8] : [8, 16, 0]; const seen = [0, 0, 0];
  const start = [0, 1].map((p) => g.solution.reachAt(0, 0, p).reduce((t, x) => t + x, 0));
  for (const { id, dealt } of decisions(g, { perRound: [99, 2, 1] })) {
    const f = frameAt(fs, g.solution, g.nodes, id, dealt); if (!f) continue;
    if (f.mine.reduce((t, x) => t + x, 0) < 0.02 * start[f.me] || f.his.reduce((t, x) => t + x, 0) < 0.02 * start[1 - f.me]) continue;
    if (seen[f.round] >= budget[f.round]) continue; seen[f.round]++; count.decisions++;
    const solved = actionValues(f); const avg = valuesOf(f, 'average'); const best = valuesOf(f, 'best');
    for (let a = 0; a < solved.length; a++) for (let c = 0; c < fs.COMBOS; c++) {
      if (Number.isNaN(solved[a][c])) continue; count.values++;
      worst.average = Math.max(worst.average, (100 * Math.abs(avg[a][c] - solved[a][c])) / pot0);
      worst.order = Math.max(worst.order, (100 * (solved[a][c] - best[a][c])) / pot0); // must not be positive
    }
    if (id === 0) {
      // the solver's own best response for the player to act, as a vector over hands at the root
      const me = f.me; const raw = Float64Array.from(g.run.solver.traverseRoot(1, me, 1)); const slots = g.run.solver.ctx.players[me].slot; // the traversal answers by storage slot const scale = g.run.solver.ctx.runoutWeight[0];
      for (let c = 0; c < fs.COMBOS; c++) { if (!(f.mine[c] > 0) || !(f.mass[c] > 0)) continue; const mine = Math.max(...best.map((v) => v[c])); const theirs = raw[slots[f.stored[c]]] / (f.mass[c] * g.run.solver.ctx.runoutWeight[0]); worst.root = Math.max(worst.root, (100 * Math.abs(mine - theirs)) / pot0); }
    }
  }
  console.log(JSON.stringify({ spot: s.name, exploit: +g.exploit.toFixed(2), ...count, seconds: Math.round((Date.now() - t0) / 1000), worst: Object.fromEntries(Object.entries(worst).map(([k, v]) => [k, v.toExponential(1)])) }));
}
