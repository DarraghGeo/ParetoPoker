// PROOF 4. The best-reply walk is right.
//   (a) in 'average' mode it reproduces the solver's own values for every hand and action;
//   (b) in 'best' mode, at the first decision, the best-reply value of the whole game agrees with the
//       solver's own best-response traversal (the one its exploitability is computed from);
//   (c) a best reply is never worth less than the solved strategy, for any hand or action;
//   (d) both players' best-reply values for the whole game, averaged, are the solver's own exploitability.
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
      // Where the board has a symmetry of its own, the solver ties mirrored hands together and its root vector is kept
      // for one hand of each such set; the others' entries are not maintained. So: for every set of mirrored hands,
      // the solver's value for at least one of them must be the value found here (which is the same for all of them).
      const R = g.spot.runouts; const maps = []; for (let i = R.stabiliserStart[0][0]; i < R.stabiliserStart[0][1]; i++) maps.push(R.stabiliserMap[0][i]);
      for (let c = 0; c < fs.COMBOS; c++) {
        if (!(f.mine[c] > 0) || !(f.mass[c] > 0)) continue;
        const orbit = [...new Set(maps.map((m) => R.maps.combo[m][c]))].filter((h) => f.mine[h] > 0 && f.mass[h] > 0);
        const mine = Math.max(...best.map((v) => v[c]));
        for (const h of orbit) worst.mirror = Math.max(worst.mirror ?? 0, (100 * Math.abs(Math.max(...best.map((v) => v[h])) - mine)) / pot0); // mirrored hands are worth the same here
        const nearest = Math.min(...orbit.map((h) => Math.abs(mine - raw[slots[f.stored[h]]] / (f.mass[h] * g.run.solver.ctx.runoutWeight[0]))));
        worst.root = Math.max(worst.root, (100 * nearest) / pot0);
      }
    }
  }
  // (d) the whole game: both players' best-reply values, averaged, against the solver's own exploitability
  { const startRanges = [0, 1].map((p) => { const raw = g.solution.reachAt(0, 0, p); const found = g.spot.resolveBoard(g.spot.board); const out = new Float64Array(fs.COMBOS); for (let c = 0; c < fs.COMBOS; c++) out[c] = raw[found.combos[c]]; return out; });
    const mineExploit = (100 * (valuesOf.gameValue(0, startRanges) + valuesOf.gameValue(1, startRanges))) / 2 / pot0; worst.exploitability = Math.abs(mineExploit - g.run.exploitabilityPercent()); }
  console.log(JSON.stringify({ spot: s.name, exploit: +g.exploit.toFixed(2), ...count, seconds: Math.round((Date.now() - t0) / 1000), worst: Object.fromEntries(Object.entries(worst).map(([k, v]) => [k, v.toExponential(1)])) }));
}
