import { NUM_COMBOS, parseCombo } from './cards.js';
import { Equity } from './Equity.js';
import { EquitySelector, SelectionContext, candidatesInOrder, deal, normalizeCandidates, sumOf } from './HandSelector.js';
import { PureMixer, capsOf } from './Mixer.js';
import { ParetoEngine } from './ParetoEngine.js';
import { NoTuner } from './Tuner.js';

const AGGRESSIVE = new Set(['bet', 'raise', 'allin']);

/**
 * Fills ParetoEngine's frequencies with hands.
 *
 * Four parts, each its own object: the engine says how much of the range bets for value, calls
 * and bluffs (the fundamentals); a tuner adjusts that for the spot (Tuner.js); a hand selector
 * says which hands come first (HandSelector.js); a mixer says how often a hand takes a role it
 * is dealt (Mixer.js). The strategist deals the frequencies out over the
 * selector's candidates, best first: value bets and raises, then calls, then bluffs, and
 * everything left checks or folds. Hands on a boundary are mixed so the totals match the
 * engine's frequencies exactly, unless the candidates run out.
 *
 * The default selector works on equity alone: value bet the most equity, bluff the least. It is
 * a stand-in for a solver's hand selection: the frequencies are right, the hands only reasonable.
 */
export class RangeStrategist {
  /**
   * @param {Object} [options]
   * @param {ParetoEngine} [options.engine]
   * @param {Equity} [options.equity]
   * @param {import('./HandSelector.js').HandSelector} [options.selector] Your hand selection:
   *   any of `value`, `call` and `bluff`. Whatever it leaves out is chosen on equity.
   * @param {import('./Mixer.js').MixerLike} [options.mixer] How often a hand takes a role it is a
   *   candidate for. Default: every hand plays pure.
   * @param {import('./Tuner.js').TunerLike} [options.tuner] Adjusts the engine's frequencies for
   *   the spot. Default: the fundamentals, untouched.
   * @param {number} [options.valueThreshold] For the equity selector, see EquitySelector.
   * @param {number} [options.callFloor] For the equity selector, see EquitySelector.
   */
  constructor({ engine = new ParetoEngine(), equity = new Equity(), selector = null, mixer = new PureMixer(), tuner = new NoTuner(), ...equityOptions } = {}) {
    this.engine = engine;
    this.equity = equity;
    this.selector = selector;
    this.mixer = mixer;
    this.tuner = tuner;
    this.fallback = new EquitySelector(equityOptions);
  }

  /**
   * @param {Object} node
   * @param {'ip'|'oop'} node.position Hero's position.
   * @param {import('./ParetoEngine.js').Spot} node.spot Without `options`: they come from `actions`.
   * @param {number[]} node.board Card ids.
   * @param {Float64Array} node.hero Hero's weight per combo at this node.
   * @param {Float64Array} node.villain Villain's weight per combo at this node.
   * @param {Float64Array} [node.villainPrior] Villain's range before any action. Used instead when
   *   `villain` is empty, and passed to the selector.
   * @param {{ type: 'fold'|'check'|'call'|'bet'|'raise'|'allin', to?: number }[]} node.actions
   *   What hero may do. `to` is hero's street total after a bet or raise.
   * @param {number[]} [node.targets] The share of hero's range that takes each action, in the
   *   order of `actions`. When given, these are filled in place of the engine's frequencies (each
   *   bet or raise still split into value and bluffs at the engine's ratio for its size), so that
   *   only the choice of hands is the selector's. Used to test hand selection on its own.
   * @param {boolean} [node.direct] With `targets`: still let the mixer spread them by kind of hand.
   * @returns {{ frequencies: Object, played: number[], strategy: Float64Array[], actions: Object[] }}
   *   `strategy[a][combo]` is the probability that the combo takes `actions[a]`. `frequencies` is
   *   the engine's answer and `played[a]` the share of the range that ends up taking `actions[a]`
   *   (the two differ only when a selector offers too few hands, or sets its own share).
   */
  decide({ position, spot, board, hero, villain, villainPrior, actions, targets = null, direct: kinds = false }) {
    // A line villain should never take (by our model of them) leaves no range to compare with
    if (villainPrior && !(sumOf(villain) > 1e-9)) villain = villainPrior;

    const index = (type) => actions.findIndex((a) => a.type === type);
    const sized = actions.map((a, i) => ({ ...a, index: i })).filter((a) => AGGRESSIVE.has(a.type));
    const facing = (spot.toCall ?? 0) > 0;
    const passive = facing ? index('fold') : index('check');
    if (passive < 0) throw new Error(`actions must include ${facing ? 'fold' : 'check'}`);

    const context = new SelectionContext({ equity: this.equity, position, spot, board, hero, villain, villainPrior, actions });
    const total = sumOf(hero);
    // With someone else's frequencies there is nothing left to tune
    const tuning = targets ? null : this.tuner.tune(context) ?? null;
    context.tuning = tuning;

    // The engine asks how much of the range is value at each size; the selector's candidates say
    const valueHands = new Map();
    const valueShare = (wager) => {
      const candidates = this.#candidates('value', context, wager);
      valueHands.set(wager.to, candidates);
      if (candidates.share != null) return candidates.share;
      let value = 0;
      for (let i = 0; i < NUM_COMBOS; i++) {
        if (hero[i] > 0 && !Number.isNaN(candidates.scores[i])) value += hero[i] * (candidates.limit ? candidates.limit[i] : 1);
      }
      return total > 0 ? value / total : 0;
    };
    const frequencies = this.engine.respond(position, { ...spot, options: sized.map((a) => a.to) }, { valueShare, tuning });
    if (targets) {
      // Someone else's frequencies: keep the engine's price of each size, replace the amounts
      for (const wager of frequencies.sizes) {
        const share = targets[sized.find((a) => Math.min(a.to, (spot.invested ?? 0) + (spot.stack ?? Infinity)) === wager.to).index];
        Object.assign(wager, { frequency: share, value: share * (1 - wager.bluffShare), bluff: share * wager.bluffShare });
      }
      const aggressive = frequencies.sizes.reduce((sum, wager) => sum + wager.frequency, 0);
      if (facing) Object.assign(frequencies, { fold: targets[passive], call: targets[index('call')], raise: aggressive });
      else Object.assign(frequencies, { check: targets[passive], bet: aggressive });
    }
    context.frequencies = frequencies;

    const strategy = actions.map(() => new Float64Array(NUM_COMBOS));
    const left = new Float64Array(NUM_COMBOS).fill(1); // probability each combo has not yet used
    const most = (spot.invested ?? 0) + (spot.stack ?? Infinity);
    const actionFor = (wager) => strategy[sized.find((a) => Math.min(a.to, most) === wager.to).index];
    const give = ({ scores, limit }, out, share) => deal(candidatesInOrder(scores, hero), scores, hero, left, out, share * total, limit);
    const biggestFirst = [...frequencies.sizes].reverse();

    // With targets, a selector's own share is ignored
    const own = (candidates, share) => (targets ? share : candidates.share ?? share);
    // A frequency that does not come from counting the selector's candidates has to be filled anyway
    const fill = targets || tuning?.frequency != null;
    // A mixer may say outright how often each hand bets or raises (`direct`): the frequency is
    // then spread over the sizes the engine chose, and nothing is dealt for those actions.
    // Facing a bet it may also give how often each hand calls: `{ aggressive, call }`.
    const answer = targets && !kinds ? null : this.mixer.direct?.(context, frequencies);
    const direct = answer ? answer.aggressive ?? answer : null;
    const directCall = answer?.call ?? null;
    if (directCall) {
      const out = strategy[index('call')];
      for (let i = 0; i < NUM_COMBOS; i++) {
        out[i] = Math.min(1, Math.max(0, directCall[i]));
        left[i] -= out[i];
      }
    }
    if (direct) {
      const aggressive = frequencies.sizes.reduce((sum, wager) => sum + wager.frequency, 0);
      const shareOf = (wager) => (aggressive > 0 ? wager.frequency / aggressive : wager.weight);
      for (const wager of frequencies.sizes) {
        const out = actionFor(wager);
        for (let i = 0; i < NUM_COMBOS; i++) out[i] = Math.min(1, Math.max(0, direct[i])) * shareOf(wager);
      }
      for (let i = 0; i < NUM_COMBOS; i++) left[i] -= Math.min(1, Math.max(0, direct[i]));
    }
    for (const wager of direct ? [] : biggestFirst) {
      if (!(wager.value > 0)) continue;
      const unplaced = give(valueHands.get(wager.to), actionFor(wager), wager.value);
      // More value asked for than the selector has candidates: the next strongest hands make it up
      if (fill && unplaced > 1e-9) give({ scores: context.strength, limit: null }, actionFor(wager), unplaced / total);
    }
    if (facing && !directCall) {
      const candidates = this.#candidates('call', context);
      const share = own(candidates, frequencies.call);
      if (share > 0) {
        const unplaced = give(candidates, strategy[index('call')], share);
        // More calls asked for than the selector has candidates: the next strongest hands make it up
        if ((targets || tuning) && unplaced > 1e-9) give({ scores: context.strength, limit: null }, strategy[index('call')], unplaced / total);
      }
    }
    for (const wager of direct ? [] : biggestFirst) {
      if (!(wager.bluff > 0)) continue;
      const candidates = this.#candidates('bluff', context, wager);
      give(candidates, actionFor(wager), own(candidates, wager.bluff));
    }
    // Everything else checks or folds (as do combos outside hero's range)
    for (let i = 0; i < NUM_COMBOS; i++) strategy[passive][i] = left[i];

    const played = strategy.map((probabilities) => {
      let weight = 0;
      for (let i = 0; i < NUM_COMBOS; i++) weight += hero[i] * probabilities[i];
      return total > 0 ? weight / total : 0;
    });
    return { frequencies, played, strategy, actions };
  }

  /**
   * The selector's order alone, as one score per combo: the higher, the sooner the hand bets for
   * value or continues; the lowest are the first bluffs. Facing a bet it is the calling order.
   * First to act it is the value order (for the size the engine prefers) on top and the bluff
   * order, reversed, underneath. Used to test an order with someone else's frequencies and mixing.
   */
  order({ position, spot, board, hero, villain, villainPrior, actions }) {
    if (villainPrior && !(sumOf(villain) > 1e-9)) villain = villainPrior;
    const context = new SelectionContext({ equity: this.equity, position, spot, board, hero, villain, villainPrior, actions });
    context.tuning = this.tuner.tune(context) ?? null;
    const out = new Float64Array(NUM_COMBOS).fill(-Infinity);
    if ((spot.toCall ?? 0) > 0) {
      const { scores } = this.#candidates('call', context);
      for (let i = 0; i < NUM_COMBOS; i++) if (hero[i] > 0) out[i] = Number.isNaN(scores[i]) ? -1e6 + context.strength[i] : scores[i];
      return out;
    }
    const sized = actions.filter((a) => AGGRESSIVE.has(a.type)).map((a) => a.to);
    const seen = new Map();
    const frequencies = this.engine.respond(position, { ...spot, options: sized }, { valueShare: (wager) => { seen.set(wager.to, this.#candidates('value', context, wager)); return 0; }, tuning: context.tuning });
    const wager = frequencies.sizes.reduce((best, w) => (w.weight > best.weight ? w : best), frequencies.sizes[0]);
    if (!wager) return context.strength;
    const value = seen.get(wager.to).scores;
    const bluff = this.#candidates('bluff', context, wager).scores;
    for (let i = 0; i < NUM_COMBOS; i++) {
      if (!(hero[i] > 0)) continue;
      out[i] = !Number.isNaN(value[i]) ? 1e6 + value[i] : -(Number.isNaN(bluff[i]) ? -1e6 : bluff[i]);
    }
    return out;
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

  /** The selector's answer for a role, or the equity selector's when it has none. */
  #candidates(role, context, wager) {
    const answer = this.selector?.[role]?.(context, wager) ?? this.fallback[role](context, wager);
    // Hands a selector names without ordering are taken on equity: best first, or worst first for bluffs
    const tiebreak = role === 'bluff' ? context.strength.map((e) => -e) : context.strength;
    const candidates = normalizeCandidates(answer, tiebreak);
    // The mixer caps how often each hand takes the role
    const caps = capsOf(this.mixer.mix(context, role, wager));
    if (caps) candidates.limit = candidates.limit ? candidates.limit.map((l, i) => Math.min(l, caps[i])) : caps;
    return candidates;
  }
}
