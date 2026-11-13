import { NUM_COMBOS } from './cards.js';

/**
 * River frequencies derived from the two ranges, with no solving and nothing fitted.
 *
 * The bettor's hands are measured by their equity against the other range (on the river: the
 * share of it they beat). The von Neumann thresholds (Ferguson & Ferguson, "On the Borel and
 * von Neumann Poker Models", section 5.3) follow from three indifferences, for a bet of `s` pots:
 *
 * - the caller's threshold hand c: bluffs are s/(1+s) of the value bets, F(a) = s/(1+s) (1 - F(b));
 * - the bettor's best bluff a: betting must be worth what checking is, its showdown equity a,
 *   so the caller folds c = (s + a)/(1 + s), more than s/(1+s);
 * - the bettor's thinnest value bet b: it must beat half of what calls, b = (1 + c)/2.
 *
 * A raise changes the third only. A value bet that is raised loses its bet to the hands that
 * beat it, as it would to a call, but to a bluff raise it also gives up the pot it would have
 * won by checking: (1 + s) for every bluff raise. So b = (1 + c)/2 + (1 + s)/(2 s) x bluff raises.
 * His bluff raises are balanced to his value raises (the price hero gets to call the raise), and
 * his value raises are the hands that beat half of what hero calls a raise with. Bigger raises
 * and deeper stacks make more of them, which is why the bet frequency falls with both.
 *
 * @param {Object} input
 * @param {Float64Array} input.hero Bettor's weights per combo.
 * @param {Float64Array} input.strength Bettor's equity per combo against the other range.
 * @param {Float64Array} input.villain The other range's weights.
 * @param {Float64Array} input.villainStrength Its equity per combo against the bettor's range.
 * @param {number} input.bet The bet, in pots.
 * @param {number} [input.raiseTo] What he can raise to, in pots (his whole wager). Omit or pass a
 *   value no bigger than the bet when he cannot raise.
 * @returns {{ value: number, bluff: number, call: number, frequency: number, fold: number, bluffRaises: number }}
 *   `value`: the lowest equity that bets for value. `bluff`: the highest that bluffs. `call`: the
 *   equity (against the bettor's whole range) he calls from. `frequency`: how much of the
 *   bettor's range bets. `fold`: how much of his range folds to the bet.
 */
export function riverThresholds({ hero, strength, villain, villainStrength, bet: s, raiseTo = 0 }) {
  const mine = sorted(hero, strength);
  const his = sorted(villain, villainStrength);
  const F = (t) => below(mine, t);
  const solve = (extra) => {
    // b - extra = (1 + c)/2 and c = (s + a)/(1 + s) give a = 2 (1 + s)(b - extra) - (1 + 2 s)
    let low = Math.min(1, (1 + 2 * s) / (2 + 2 * s) + extra);
    let high = 1;
    if (low >= 1) return { value: 1, bluff: 0 };
    for (let pass = 0; pass < 40; pass++) {
      const b = (low + high) / 2;
      const a = 2 * (1 + s) * (b - extra) - (1 + 2 * s);
      if (F(a) - (s / (1 + s)) * (1 - F(b)) < 0) low = b; else high = b;
    }
    const value = (low + high) / 2;
    return { value, bluff: Math.max(0, 2 * (1 + s) * (value - extra) - (1 + 2 * s)) };
  };
  let cuts = solve(0);
  let bluffRaises = 0;
  if (raiseTo > s) {
    const alpha = raiseTo / (raiseTo + 1 + s);             // what his raise needs hero to fold
    const price = (raiseTo - s) / (1 + 2 * raiseTo);        // hero's pot odds against the raise
    for (let pass = 0; pass < 12; pass++) {
      const frequency = 1 - F(cuts.value) + F(cuts.bluff);
      // Hero calls a raise with the top (1 - alpha) of what he bet; a value raise beats half of that
      const calls = (1 - alpha) * frequency;
      const needed = quantile(mine, 1 - calls / 2);
      const valueRaises = 1 - below(his, quantile(his, shareBelowEquity(his, mine, needed)));
      const next = Math.min(valueRaises * (price / (1 - price)), 1);
      bluffRaises = pass ? (bluffRaises + next) / 2 : next;
      cuts = solve(((1 + s) / (2 * s)) * bluffRaises);
    }
  }
  const frequency = 1 - F(cuts.value) + F(cuts.bluff);
  const call = (s + cuts.bluff) / (1 + s);
  return { ...cuts, call, frequency, fold: Math.min(1, call), bluffRaises };
}

/**
 * How much of his range folds to a bet of `s` pots, seen from the defender's side, when only
 * the betting range is known: the bettor's bluffs are its weakest s/(1+2s), and betting one must
 * be worth what checking it is, its showdown equity `v`, so he folds (s + v)/(1 + s). `v` is taken
 * at the middle of the bluffs. `checksBack` is how often a check would have reached showdown
 * (1 in position; out of position, how often the other player checks behind).
 *
 * @param {Float64Array} bettor The betting range, weights per combo.
 * @param {Float64Array} bettorStrength Its equity per combo against the defender's range.
 * @param {number} s The bet, in pots.
 * @param {number} [checksBack]
 */
export function riverFold(bettor, bettorStrength, s, checksBack = 1) {
  const range = sorted(bettor, bettorStrength);
  if (!range.total) return s / (1 + s);
  const v = quantile(range, s / (1 + 2 * s) / 2) * checksBack;
  return Math.min(1, (s + v) / (1 + s));
}

function sorted(weights, score) {
  const hands = [];
  let total = 0;
  for (let i = 0; i < NUM_COMBOS; i++) if (weights[i] > 1e-9 && !Number.isNaN(score[i])) { hands.push({ e: score[i], w: weights[i] }); total += weights[i]; }
  hands.sort((x, y) => x.e - y.e);
  return { hands, total };
}
/** Share of the range with a score under `t`. */
function below({ hands, total }, t) {
  let sum = 0;
  for (const h of hands) { if (h.e >= t) break; sum += h.w; }
  return total > 0 ? sum / total : 0;
}
/** The score at share `q` of the range, counted from the weakest. */
function quantile({ hands, total }, q) {
  let sum = 0;
  for (const h of hands) { sum += h.w; if (sum >= q * total) return h.e; }
  return hands.length ? hands[hands.length - 1].e : 0;
}
/**
 * A hand of the bettor with equity `e` beats that share of his range; the share of his range
 * that beats it is the rest. Returned as the share of his range below it, which is `e` itself on
 * the river: equity against a range is the share of it beaten.
 */
function shareBelowEquity(his, mine, e) {
  return Math.min(1, Math.max(0, e));
}

/**
 * The von Neumann thresholds for two uniform ranges and a bet of `s` pots (Ferguson & Ferguson,
 * theorem 2, with B = 2s): bluffs below `a`, value above `b`, calls above `c`.
 */
export function uniformThresholds(s) {
  const B = 2 * s;
  const d = (B + 1) * (B + 4);
  return { a: B / d, b: (B * B + 4 * B + 2) / d, c: (B * (B + 3)) / d };
}

/**
 * What a hand with river equity `e` is worth on the river, as a share of the pot, when it is
 * the one who may bet `s` pots: the value of the von Neumann game for that hand.
 *
 *   worth(e) = max(a, e, e + 2 s (e - b))
 *
 * Below `a` it bluffs and is worth `a` whatever it holds; in the middle it checks and is worth
 * its equity; above `b` it bets and every point of equity is worth 1 + 2s points. The function
 * is convex: equity that arrives in lumps is worth more than the same equity spread evenly,
 * which is why two turn hands of equal equity are not equal.
 */
export function riverWorthOf(e, s = 0.75, cuts = uniformThresholds(s)) {
  return Math.max(cuts.a, e, e + 2 * s * (e - cuts.b));
}

/**
 * A turn hand as one number: the average, over the river cards, of what its river equity is
 * worth (`riverWorthOf`). Hands with the same distribution of river equities get the same
 * number; so do some that differ, but unlike average equity it counts how the equity arrives.
 * With no card to come it is `riverWorthOf` of the equity.
 *
 * @param {Object} input
 * @param {import('./Equity.js').Equity} input.equity
 * @param {number[]} input.board Card ids (3 to 5).
 * @param {Float64Array} input.hero Weights per combo: the hands to measure.
 * @param {Float64Array} input.villain
 * @param {number} [input.bet] The river bet the worth is taken for, in pots.
 * @returns {Float64Array} Per combo id; NaN outside hero's range.
 */
export function riverWorth({ equity, board, hero, villain, bet = 0.75 }) {
  const cuts = uniformThresholds(bet);
  const out = new Float64Array(NUM_COMBOS).fill(NaN);
  if (board.length >= 5) {
    const e = equity.against(board, villain, hero);
    for (let i = 0; i < NUM_COMBOS; i++) if (hero[i] > 0 && !Number.isNaN(e[i])) out[i] = riverWorthOf(e[i], bet, cuts);
    return out;
  }
  const sum = new Float64Array(NUM_COMBOS);
  const count = new Float64Array(NUM_COMBOS);
  const walk = (cards) => {
    if (cards.length === 5) {
      const e = equity.against(cards, villain, hero);
      for (let i = 0; i < NUM_COMBOS; i++) if (hero[i] > 0 && !Number.isNaN(e[i])) { sum[i] += riverWorthOf(e[i], bet, cuts); count[i]++; }
      return;
    }
    for (let card = cards.length === board.length ? 0 : cards[cards.length - 1] + 1; card < 52; card++) if (!cards.includes(card)) walk([...cards, card]);
  };
  walk(board);
  for (let i = 0; i < NUM_COMBOS; i++) if (count[i]) out[i] = sum[i] / count[i];
  return out;
}
