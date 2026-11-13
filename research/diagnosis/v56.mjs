// Do raises and stacks explain why the solver's frequencies leave the standard formulas?
// River trees with one bet size, solved with no raise allowed and with raises of several sizes
// and stacks. For each: the solver's frequencies against the formulas (fold s/(1+s), bluffs
// s/(1+2s) of the bets, bet frequency from the von Neumann thresholds on hero's equity curve),
// the untuned engine's frequencies at the same decisions, and what the untuned engine loses.
//   node diagnosis/v56.mjs [spots per pair]
import { Equity, RangeStrategist, SolverBridge, SolverMatch, cards, presets } from '../src/index.js';
import { SPOTS, gameOf, pool } from '../src/solver/spots.js';
const { NUM_COMBOS } = cards;
const equity = new Equity();
const sum = (xs) => { let t = 0; for (const x of xs) t += x; return t; };
// One depth of each river tuning spot: 4 pairs of ranges x 6 boards
const base = SPOTS['rivers-tune'].filter((s) => s.depth === 2);
const CONDITIONS = [
  { name: 'no raise', raise: '', stack: 5 },
  { name: 'raise 2.5x, 1 pot behind', raise: '2.5x', stack: 1 },
  { name: 'raise 2.5x, 2 pots behind', raise: '2.5x', stack: 2 },
  { name: 'raise 2.5x, 5 pots behind', raise: '2.5x', stack: 5 },
  { name: 'raise all-in, 2 pots behind', raise: 'a', stack: 2 },
  { name: 'raise all-in, 5 pots behind', raise: 'a', stack: 5 },
];
function vonNeumann(e, w, s) {
  const B = 2 * s; const total = sum(w);
  const F = (t) => { let x = 0; for (let i = 0; i < e.length; i++) if (e[i] < t) x += w[i]; return x / total; };
  let lo = (B + 1) / (B + 2); let hi = 1;
  for (let k = 0; k < 40; k++) { const b = (lo + hi) / 2; if (F((B + 2) * b - (B + 1)) - (B / (B + 2)) * (1 - F(b)) < 0) lo = b; else hi = b; }
  const b = (lo + hi) / 2;
  return 1 - F(b) + F((B + 2) * b - (B + 1));
}
async function one(spot, condition, s) {
  const sizes = { bet: `${Math.round(100 * s)}%`, raise: condition.raise };
  const game = { ...gameOf({ ...spot, stack: 100 * condition.stack, sizes }), add_allin_threshold: 0, force_allin_threshold: 0 };
  const bridge = new SolverBridge(); const out = {};
  try {
    const info = await bridge.init(game);
    await bridge.solve({ iterations: 2000, target: 0.001 });
    const ids = info.hands.map((hands) => hands.map(([a, b]) => cards.comboId(a, b)));
    const spread = (p, values) => { const o = new Float64Array(NUM_COMBOS); values.forEach((v, i) => { o[ids[p][i]] = v; }); return o; };
    const board = cards.parseCards(spot.board);
    const engine = new RangeStrategist(presets.equity());
    for (const [seat, open, faced] of [['oop', [], [1]], ['ip', [0], [0, 1]]]) {
      // The opening decision of this seat
      const node = await bridge.node(open); const me = node.player;
      const { strategy, weights } = await bridge.strategy(open); const n = ids[me].length;
      const hero = spread(me, weights[me]); const villain = spread(1 - me, weights[1 - me]);
      const total = sum(weights[me]);
      const bet = node.actions.findIndex((a) => a.to != null);
      let bets = 0; for (let h = 0; h < n; h++) bets += weights[me][h] * strategy[bet * n + h];
      const strength = equity.against(board, villain, hero);
      const live = ids[me].filter((id, h) => weights[me][h] > 1e-6);
      const mine = engine.decide({ position: seat, spot: { street: 'river', pot: 100, stack: game.stack, toCall: 0, invested: 0, facing: 0, raises: 0, streetPot: 100 }, board, hero, villain, actions: node.actions });
      // The bets: what share is a bluff (under half equity against his range), and whether the air all bets
      let bluffs = 0, air = 0, airBets = 0;
      ids[me].forEach((id, h) => { const w = weights[me][h]; const b = w * strategy[bet * n + h]; if (strength[id] < 0.5) bluffs += b; if (strength[id] < 0.15) { air += w; airBets += b; } });
      out[`${seat} bets`] = bets / total; out[`${seat} bets, von Neumann`] = vonNeumann(live.map((id) => strength[id]), live.map((id) => hero[id]), s);
      out[`${seat} bets, engine`] = mine.played[bet]; out[`${seat} bluff share of bets`] = bets > 0 ? bluffs / bets : NaN; out[`${seat} air that bets`] = air > 0 ? airBets / air : NaN;
      // The other seat facing that bet
      const next = await bridge.node(faced); const them = next.player;
      const answer = await bridge.strategy(faced); const m = ids[them].length; const all = sum(answer.weights[them]);
      const freq = next.actions.map((_, a) => { let t = 0; for (let h = 0; h < m; h++) t += answer.weights[them][h] * answer.strategy[a * m + h]; return t / all; });
      const fold = next.actions.findIndex((a) => a.type === 'fold'); const call = next.actions.findIndex((a) => a.type === 'call');
      const his = engine.decide({ position: seat === 'oop' ? 'ip' : 'oop', spot: { street: 'river', pot: 100 + 100 * s, stack: game.stack, toCall: 100 * s, invested: 0, facing: 100 * s, raises: 0, streetPot: 100 }, board, hero: spread(them, answer.weights[them]), villain: spread(me, answer.weights[me]), actions: next.actions });
      const other = seat === 'oop' ? 'ip' : 'oop';
      out[`${other} folds to the bet`] = freq[fold]; out[`${other} raises the bet`] = 1 - freq[fold] - freq[call]; out[`${other} folds, engine`] = his.played[fold];
    }
  } finally { bridge.close(); }
  // What the untuned engine loses in this tree
  for (const name of ['equity', 'napkin']) for (const seat of ['oop', 'ip']) {
    const r = await new SolverMatch(game, { strategist: new RangeStrategist(presets[name]()) }).play(seat, { iterations: 300 });
    out[`loss, ${name} preset, ${seat}`] = r.loss.exploited;
  }
  return out;
}
const limit = Number(process.argv[2] ?? 6);
const spots = base.filter((s, i) => i % 6 < limit);
for (const s of [0.33, 0.75, 1.5]) {
  console.log(`\n=== bet ${Math.round(100 * s)}% of the pot: formulas fold ${(s / (1 + s)).toFixed(3)}, bluff share of bets ${(s / (1 + 2 * s)).toFixed(3)}; ${spots.length} river spots`);
  const table = {};
  for (const condition of CONDITIONS) {
    const rows = await pool(spots, (spot) => one(spot, condition, s));
    for (const key of Object.keys(rows[0])) {
      const xs = rows.map((r) => r[key]).filter((x) => !Number.isNaN(x));
      (table[key] ??= {})[condition.name] = xs.reduce((t, x) => t + x, 0) / xs.length;
      if (key.includes('folds to the bet')) (table[`${key}: mean distance from the formula`] ??= {})[condition.name] = xs.reduce((t, x) => t + Math.abs(x - s / (1 + s)), 0) / xs.length;
      if (key.endsWith(' bets')) { const vn = rows.map((r) => r[`${key}, von Neumann`]); (table[`${key}: mean distance from von Neumann`] ??= {})[condition.name] = rows.reduce((t, r, i) => t + Math.abs(r[key] - vn[i]), 0) / rows.length; }
    }
  }
  console.log(`${''.padEnd(48)} ${CONDITIONS.map((c) => c.name.replace('raise ', 'r ').replace(' pots behind', 'p').replace(' pot behind', 'p').padStart(13)).join('')}`);
  for (const [key, row] of Object.entries(table)) console.log(`${key.padEnd(48)} ${CONDITIONS.map((c) => (key.startsWith('loss') ? (100 * row[c.name]).toFixed(2) : row[c.name].toFixed(3)).padStart(13)).join('')}`);
}
