import { NUM_COMBOS, parseCombo } from './cards.js';
import { Equity } from './Equity.js';
import { ParetoEngine } from './ParetoEngine.js';

const AGGRESSIVE = new Set(['bet', 'raise', 'allin']);
const DEFAULTS = {
  /** Equity against the range that continues which a hand needs to bet or raise for value. */
  valueThreshold: 0.5,
  /**
   * A hand only calls when its equity against villain's range is at least this share of the pot
   * odds. Against a balanced bet a bluff catcher has exactly the pot odds, so a hand far below
   * them loses to the bluffs too and is no bluff catcher. A range with too few hands above the
   * floor defends less than the minimum defence frequency. 0 turns the floor off.
   */
  callFloor: 0.5,
};

/**
 * Fills ParetoEngine's frequencies with hands.
 *
 * Hands are ordered by equity against the opponent's range and the frequencies are dealt out
 * along that order: the strongest hands bet or raise for value, the next strongest call, the
 * weakest bluff, and everything else checks or folds. Hands on a boundary are mixed so the
 * totals match the engine's frequencies exactly (calls fall short only when the range runs out
 * of hands that beat a bluff, see `callFloor`). This is a stand-in for a solver's hand
 * selection: the frequencies are right, the choice of hands is only reasonable.
 */
export class RangeStrategist {
  /**
   * @param {Object} [options]
   * @param {ParetoEngine} [options.engine]
   * @param {Equity} [options.equity]
   * @param {number} [options.valueThreshold]
   * @param {number} [options.callFloor]
   */
  constructor({ engine = new ParetoEngine(), equity = new Equity(), ...config } = {}) {
    this.engine = engine;
    this.equity = equity;
    this.config = { ...DEFAULTS, ...config };
  }

  /**
   * @param {Object} node
   * @param {'ip'|'oop'} node.position Hero's position.
   * @param {import('./ParetoEngine.js').Spot} node.spot Without `options`: they come from `actions`.
   * @param {number[]} node.board Card ids.
   * @param {Float64Array} node.hero Hero's weight per combo at this node.
   * @param {Float64Array} node.villain Villain's weight per combo at this node.
   * @param {Float64Array} [node.villainPrior] Used instead when `villain` is empty.
   * @param {{ type: 'fold'|'check'|'call'|'bet'|'raise'|'allin', to?: number }[]} node.actions
   *   What hero may do. `to` is hero's street total after a bet or raise.
   * @returns {{ frequencies: Object, strategy: Float64Array[], actions: Object[] }} `strategy[a][combo]`
   *   is the probability that the combo takes `actions[a]`. `frequencies` is the engine's answer.
   */
  decide({ position, spot, board, hero, villain, villainPrior, actions }) {
    // A line villain should never take (by our model of them) leaves no range to compare with
    if (villainPrior && !(sumOf(villain) > 1e-9)) villain = villainPrior;
    const index = (type) => actions.findIndex((a) => a.type === type);
    const sized = actions.map((a, i) => ({ ...a, index: i })).filter((a) => AGGRESSIVE.has(a.type));
    const facing = (spot.toCall ?? 0) > 0;
    const passive = facing ? index('fold') : index('check');
    if (passive < 0) throw new Error(`actions must include ${facing ? 'fold' : 'check'}`);

    // Strength of each hand against villain's range, and of villain's hands against ours
    const strength = this.equity.against(board, villain);
    const villainStrength = this.equity.against(board, hero, villain);
    const total = sumOf(hero);

    // A hand is value when it is ahead of the part of villain's range that continues: their
    // strongest hands up to the defence frequency, leaving out those too weak to catch a bluff
    const versusContinue = new Map();
    const valueShare = (wager) => {
      const floor = this.config.callFloor * wager.potOdds;
      const continuing = topShare(villain, villainStrength, wager.mdf, floor);
      const equity = this.equity.against(board, continuing, hero);
      versusContinue.set(wager.to, equity);
      let value = 0;
      for (let i = 0; i < NUM_COMBOS; i++) {
        if (hero[i] > 0 && equity[i] > this.config.valueThreshold) value += hero[i];
      }
      return total > 0 ? value / total : 0;
    };

    const input = { valueShare };
    const options = sized.map((a) => a.to);
    const frequencies = this.engine.respond(position, { ...spot, options }, input);

    const strategy = actions.map(() => new Float64Array(NUM_COMBOS));
    const left = new Float64Array(NUM_COMBOS).fill(1); // probability each combo has not yet used
    const strongest = orderBy(strength, hero, -1);
    const weakest = orderBy(strength, hero, 1);
    const most = (spot.invested ?? 0) + (spot.stack ?? Infinity);
    const actionFor = (wager) => sized.find((a) => Math.min(a.to, most) === wager.to).index;

    // Value bets and raises: the strongest hands, the biggest size first
    for (const wager of [...frequencies.sizes].reverse()) {
      if (wager.value <= 0) continue;
      const equity = versusContinue.get(wager.to);
      deal(orderBy(equity, hero, -1), equity, hero, left, strategy[actionFor(wager)], wager.value * total);
    }
    // Calls: the best of what is left
    if (facing && frequencies.call > 0) {
      const floor = this.config.callFloor * frequencies.potOdds;
      const catchers = strongest.filter((i) => strength[i] >= floor);
      deal(catchers, strength, hero, left, strategy[index('call')], frequencies.call * total);
    }
    // Bluffs: the weakest hands
    for (const wager of [...frequencies.sizes].reverse()) {
      if (wager.bluff <= 0) continue;
      deal(weakest, strength, hero, left, strategy[actionFor(wager)], wager.bluff * total);
    }
    // Everything else checks or folds (as do combos outside hero's range)
    for (let i = 0; i < NUM_COMBOS; i++) strategy[passive][i] = left[i];

    return { frequencies, strategy, actions };
  }

  /**
   * The same decision for one holding: the probability of each action for `hand` ('AhKd' or a
   * combo id), and `sample()` to draw one.
   */
  act(node, hand, random = Math.random) {
    const { frequencies, strategy, actions } = this.decide(node);
    const combo = typeof hand === 'number' ? hand : parseCombo(hand);
    const probabilities = strategy.map((s) => s[combo]);
    return {
      frequencies,
      actions: actions.map((action, i) => ({ ...action, probability: probabilities[i] })),
      sample() {
        let roll = random();
        for (const [i, p] of probabilities.entries()) {
          if ((roll -= p) < 0) return actions[i];
        }
        return actions[probabilities.indexOf(Math.max(...probabilities))];
      },
    };
  }
}

function sumOf(weights) {
  let total = 0;
  for (const w of weights) total += w;
  return total;
}

/** Combos with weight, ordered by score (direction -1 = highest first). Unscored combos go last. */
function orderBy(score, weights, direction) {
  const order = [];
  for (let i = 0; i < NUM_COMBOS; i++) if (weights[i] > 0) order.push(i);
  const key = (i) => (Number.isNaN(score[i]) ? Infinity : direction * score[i]);
  return order.sort((a, b) => key(a) - key(b));
}

/**
 * Gives `target` combo weight to `out`, walking `order` and using each combo's unused
 * probability in `left`. Combos with the same score share the last slice evenly, so the result
 * does not depend on how ties happen to be ordered (and stays the same across equivalent suits).
 */
function deal(order, score, weights, left, out, target) {
  let remaining = target;
  for (let start = 0; start < order.length && remaining > 1e-12; ) {
    let end = start;
    let available = 0;
    const value = score[order[start]];
    while (end < order.length && same(score[order[end]], value)) {
      available += weights[order[end]] * left[order[end]];
      end++;
    }
    const fraction = available <= remaining ? 1 : remaining / available;
    for (let k = start; k < end; k++) {
      const i = order[k];
      const taken = left[i] * fraction;
      out[i] += taken;
      left[i] -= taken;
    }
    remaining -= available * fraction;
    start = end;
  }
}

function same(a, b) {
  return Math.abs(a - b) < 1e-9 || (Number.isNaN(a) && Number.isNaN(b));
}

/** The strongest `share` of a range, as weights (the boundary hands are scaled down), from hands scoring at least `floor`. */
function topShare(weights, score, share, floor = 0) {
  const out = new Float64Array(NUM_COMBOS);
  const left = new Float64Array(NUM_COMBOS).fill(1);
  const picked = new Float64Array(NUM_COMBOS);
  const order = orderBy(score, weights, -1).filter((i) => score[i] >= floor);
  deal(order, score, weights, left, picked, share * sumOf(weights));
  for (let i = 0; i < NUM_COMBOS; i++) out[i] = weights[i] * picked[i];
  return out;
}
