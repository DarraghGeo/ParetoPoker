// The derived river formulas (src/derived.js) against the solver's frequencies, in the trees of
// diagnosis/v56.mjs: one bet size, no raise or raises of several sizes and stacks.
import { Equity, SolverBridge, cards } from '../src/index.js';
import { riverFold, riverThresholds } from '../src/derived.js';
import { SPOTS, gameOf, pool } from '../src/solver/spots.js';
const { NUM_COMBOS } = cards; const equity = new Equity();
const spots = SPOTS['rivers-tune'].filter((s) => s.depth === 2);
const CONDITIONS = [['no raise', '', 5, 0], ['raise 2.5x, 2 pots', '2.5x', 2, 2.5], ['raise 2.5x, 5 pots', '2.5x', 5, 2.5], ['raise all-in, 2 pots', 'a', 2, Infinity], ['raise all-in, 5 pots', 'a', 5, Infinity]];
const corr = (a, b) => { const n = a.length; const ma = a.reduce((t, x) => t + x, 0) / n; const mb = b.reduce((t, x) => t + x, 0) / n; let ab = 0, aa = 0, bb = 0; for (let i = 0; i < n; i++) { ab += (a[i] - ma) * (b[i] - mb); aa += (a[i] - ma) ** 2; bb += (b[i] - mb) ** 2; } return ab / Math.sqrt(aa * bb); };
const mean = (xs) => xs.reduce((t, x) => t + x, 0) / xs.length;
const show = (label, actual, predicted) => `${label} ${mean(predicted).toFixed(3)} (off ${mean(actual.map((x, i) => Math.abs(x - predicted[i]))).toFixed(3)}, r ${corr(actual, predicted).toFixed(2)})`;
for (const s of [0.33, 0.75, 1.5]) for (const [name, raise, stack, multiple] of CONDITIONS) {
  const rows = await pool(spots, async (spot) => {
    const bridge = new SolverBridge(); const out = {};
    try {
      const info = await bridge.init({ ...gameOf({ ...spot, stack: 100 * stack, sizes: { bet: `${Math.round(100 * s)}%`, raise } }), add_allin_threshold: 0, force_allin_threshold: 0 });
      await bridge.solve({ iterations: 2000, target: 0.001 });
      const ids = info.hands.map((hands) => hands.map(([a, b]) => cards.comboId(a, b)));
      const spread = (p, values) => { const o = new Float64Array(NUM_COMBOS); values.forEach((v, i) => { o[ids[p][i]] = v; }); return o; };
      const board = cards.parseCards(spot.board);
      for (const [seat, open] of [['oop', []], ['ip', [0]]]) {
        const node = await bridge.node(open); const me = node.player; const { strategy, weights } = await bridge.strategy(open); const n = ids[me].length;
        const hero = spread(me, weights[me]); const villain = spread(1 - me, weights[1 - me]);
        const bet = node.actions.findIndex((a) => a.to != null);
        let bets = 0; for (let h = 0; h < n; h++) bets += weights[me][h] * strategy[bet * n + h];
        const args = { hero, strength: equity.against(board, villain, hero), villain, villainStrength: equity.against(board, hero, villain), bet: s };
        const raiseTo = multiple ? Math.min(multiple * s, stack) : 0;
        out[`${seat} bets`] = bets / weights[me].reduce((t, x) => t + x, 0);
        out[`${seat} plain`] = riverThresholds(args).frequency;
        const derived = riverThresholds({ ...args, raiseTo });
        out[`${seat} derived`] = derived.frequency;
        // The other seat facing the bet
        const answer = await bridge.strategy([...open, bet]); const them = 1 - me; const m = ids[them].length; const next = await bridge.node([...open, bet]);
        const fold = next.actions.findIndex((a) => a.type === 'fold'); let folds = 0; for (let h = 0; h < m; h++) folds += answer.weights[them][h] * answer.strategy[fold * m + h];
        out[`${seat} folded to`] = folds / answer.weights[them].reduce((t, x) => t + x, 0);
        const betting = spread(me, answer.weights[me]);
        // Out of position a checked bluff reaches showdown only when he checks behind
        const behind = seat === 'oop' ? 1 - riverThresholds({ hero: villain, strength: args.villainStrength, villain: hero, villainStrength: args.strength, bet: s, raiseTo }).frequency : 1;
        out[`${seat} fold, from the thresholds`] = Math.min(1, (s + derived.bluff * behind) / (1 + s));
        out[`${seat} fold, from the betting range`] = riverFold(betting, equity.against(board, spread(them, answer.weights[them]), betting), s, behind);
      }
    } finally { bridge.close(); }
    return out;
  });
  const col = (k) => rows.map((r) => r[k]);
  console.log(`bet ${String(Math.round(100 * s)).padStart(3)}% ${name.padEnd(22)}`);
  for (const seat of ['ip', 'oop']) {
    console.log(`    ${seat.padEnd(3)} bets ${mean(col(`${seat} bets`)).toFixed(3)} | ${show('von Neumann', col(`${seat} bets`), col(`${seat} plain`))} | ${show('with raises', col(`${seat} bets`), col(`${seat} derived`))}`);
    console.log(`        is folded to ${mean(col(`${seat} folded to`)).toFixed(3)} | s/(1+s) ${(s / (1 + s)).toFixed(3)} (off ${mean(col(`${seat} folded to`).map((x) => Math.abs(x - s / (1 + s)))).toFixed(3)}) | ${show('from the betting range', col(`${seat} folded to`), col(`${seat} fold, from the betting range`))} | ${show('from the thresholds', col(`${seat} folded to`), col(`${seat} fold, from the thresholds`))}`);
  }
}
