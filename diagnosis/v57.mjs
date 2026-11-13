// Why the defender folds more than s/(1+s) even when nobody can raise: the bettor's marginal
// bluff must be indifferent between betting and checking, and checking is worth its showdown
// equity v (share of the pot). Then he folds (s + v)/(1 + s). Checked where it is exact: in
// position betting after a check (checking back ends the hand), river, one bet size.
import { Equity, SolverBridge, cards } from '../src/index.js';
import { SPOTS, gameOf, pool } from '../src/solver/spots.js';
const { NUM_COMBOS } = cards; const equity = new Equity();
const spots = SPOTS['rivers-tune'].filter((s) => s.depth === 2);
const corr = (a, b) => { const n = a.length; const ma = a.reduce((t, x) => t + x, 0) / n; const mb = b.reduce((t, x) => t + x, 0) / n; let ab = 0, aa = 0, bb = 0; for (let i = 0; i < n; i++) { ab += (a[i] - ma) * (b[i] - mb); aa += (a[i] - ma) ** 2; bb += (b[i] - mb) ** 2; } return ab / Math.sqrt(aa * bb); };
for (const [name, raise, stack] of [['no raise', '', 5], ['raise 2.5x, 5 pots behind', '2.5x', 5], ['raise all-in, 5 pots behind', 'a', 5]]) for (const s of [0.33, 0.75, 1.5]) {
  const rows = (await pool(spots, async (spot) => {
    const bridge = new SolverBridge();
    try {
      const info = await bridge.init({ ...gameOf({ ...spot, stack: 100 * stack, sizes: { bet: `${Math.round(100 * s)}%`, raise } }), add_allin_threshold: 0, force_allin_threshold: 0 });
      await bridge.solve({ iterations: 2000, target: 0.001 });
      const ids = info.hands.map((hands) => hands.map(([a, b]) => cards.comboId(a, b)));
      const spread = (p, values) => { const o = new Float64Array(NUM_COMBOS); values.forEach((v, i) => { o[ids[p][i]] = v; }); return o; };
      const node = await bridge.node([0]); const { strategy, weights } = await bridge.strategy([0]); const n = ids[1].length;
      const strength = equity.against(cards.parseCards(spot.board), spread(0, weights[0]), spread(1, weights[1]));
      const bet = node.actions.findIndex((a) => a.to != null);
      // The marginal bluffs: weak hands the solver both bets and checks
      let w = 0, v = 0;
      ids[1].forEach((id, h) => { const p = strategy[bet * n + h]; if (strength[id] < 0.4 && p > 0.05 && p < 0.95) { const x = weights[1][h] * p; w += x; v += x * strength[id]; } });
      if (!(w > 0)) return null;
      const next = await bridge.node([0, bet]); const answer = await bridge.strategy([0, bet]); const m = ids[0].length; const all = answer.weights[0].reduce((t, x) => t + x, 0);
      const fold = next.actions.findIndex((a) => a.type === 'fold'); let folds = 0; for (let h = 0; h < m; h++) folds += answer.weights[0][h] * answer.strategy[fold * m + h];
      return { folds: folds / all, v: v / w };
    } finally { bridge.close(); }
  })).filter(Boolean);
  const mean = (f) => rows.reduce((t, r) => t + f(r), 0) / rows.length;
  const predicted = rows.map((r) => (s + r.v) / (1 + s));
  console.log(`${name.padEnd(28)} bet ${String(Math.round(100 * s)).padStart(3)}%: he folds ${mean((r) => r.folds).toFixed(3)}; s/(1+s) = ${(s / (1 + s)).toFixed(3)} (mean distance ${mean((r) => Math.abs(r.folds - s / (1 + s))).toFixed(3)}); (s+v)/(1+s) = ${(predicted.reduce((t, x) => t + x, 0) / rows.length).toFixed(3)} (mean distance ${(rows.reduce((t, r, i) => t + Math.abs(r.folds - predicted[i]), 0) / rows.length).toFixed(3)}, correlation ${corr(rows.map((r) => r.folds), predicted).toFixed(2)}); v = ${mean((r) => r.v).toFixed(3)}; ${rows.length} spots`);
}
