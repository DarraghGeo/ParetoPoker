import { STREETS_AFTER, futureValueFactor, geometricFraction, potOdds } from './math.js';

/**
 * @typedef {Object} Spot
 * @property {'flop'|'turn'|'river'} street
 * @property {number} pot         Every chip in the middle, including bets made on this street.
 * @property {number} stack       Hero's chips behind, before acting.
 * @property {number} [toCall]    Chips hero must add to call (0 or absent when no bet is faced).
 * @property {number} [invested]  Chips hero has already put in on this street.
 * @property {number} [facing]    Chips the opponent added with their last bet or raise. Defaults to
 *                                everything they have in on this street, which is right for a bet
 *                                and for a first raise.
 * @property {number} [raises]    Raises made on this street so far (a bet is not a raise).
 * @property {number} [streetPot] The pot when this street began. Used for geometric sizing.
 * @property {number[]} [options] Bet or raise sizes hero may choose from, each the total hero
 *                                would have in on this street. Defaults to the configured sizes.
 */

const DEFAULTS = {
  /** Bet sizes as pot fractions, used when a spot lists no options. 'allin' is also accepted. */
  betSizes: [0.33, 0.75, 1.5],
  /** Raise sizes as multiples of the opponent's street total, used when a spot lists no options. */
  raiseSizes: [2.5],
  /** Raises allowed per street. Once reached, the engine only calls or folds. */
  maxRaises: 3,
  /**
   * How a size is chosen from the options: 'geometric' (the one nearest the geometric size),
   * 'smallest', 'largest', 'mixed' (all, evenly), or a function (spot, wagers) => weights.
   */
  sizing: 'geometric',
  /** Share of the range that bets for value when the caller does not supply one. */
  betValueShare: 0.3,
  /** Share of the range that raises for value when the caller does not supply one. */
  raiseValueShare: 0.08,
  /** Fixes the total raise frequency as a share of the continuing range. null = from value. */
  raiseFrequency: null,
  /** Pot fraction assumed for bets on later streets, or 'geometric'. Sets how many bluffs an early bet may hold. */
  barrelSize: 0.75,
  /** false treats every street like the river (no extra bluffs for later barrels). */
  multiStreetBluffs: true,
};

const POSITION_KEYS = { ip: 'inPosition', oop: 'outOfPosition' };

/**
 * Frequencies that make an opponent indifferent, for each situation a player can be in.
 *
 * The engine does not look at cards. It answers "how often", given the price: how often to
 * bet, what share of a bet is bluffs, how often to continue against a bet or raise and how much
 * of that is a raise. Choosing which hands fill those frequencies is RangeStrategist's job.
 *
 * These are the fundamentals and do not change. Each decision also takes an optional `tuning`
 * (see Tuner.js) that adjusts them for the spot: `{ sizing, value, bluff, defence }`.
 *
 * Settings can differ by position: `new ParetoEngine({ maxRaises: 2, inPosition: { sizing: 'largest' } })`.
 */
export class ParetoEngine {
  constructor(config = {}) {
    const { inPosition = {}, outOfPosition = {}, ...shared } = config;
    this.config = {
      ip: { ...DEFAULTS, ...shared, ...inPosition },
      oop: { ...DEFAULTS, ...shared, ...outOfPosition },
    };
  }

  // --- One method per situation ---------------------------------------------------------------

  /** Out of position, first to act on the street: check or bet. */
  outOfPositionOpen(spot, input) { return this.open('oop', spot, input); }
  /** In position after a check: check back or bet. */
  inPositionFacingCheck(spot, input) { return this.open('ip', spot, input); }
  /** Out of position facing a bet (hero checked, or the bet is a donk-raise line): fold, call or raise. */
  outOfPositionFacingBet(spot, input) { return this.defend('oop', spot, input); }
  /** In position facing a bet: fold, call or raise. */
  inPositionFacingBet(spot, input) { return this.defend('ip', spot, input); }
  /** Out of position facing a raise or re-raise: fold, call or raise again. */
  outOfPositionFacingRaise(spot, input) { return this.defend('oop', spot, input); }
  /** In position facing a raise or re-raise: fold, call or raise again. */
  inPositionFacingRaise(spot, input) { return this.defend('ip', spot, input); }

  /** Picks the situation from the spot: `position` is 'ip' or 'oop'. */
  respond(position, spot, input) {
    return (spot.toCall ?? 0) > 0 ? this.defend(position, spot, input) : this.open(position, spot, input);
  }

  // --- The two decisions ----------------------------------------------------------------------

  /**
   * No bet to face: how often to bet, at which sizes, and how much of each bet is bluffs.
   *
   * `valueShare` is the share of hero's range strong enough to bet for value: a number, or a
   * function of the wager (a bigger bet is called by a stronger range, so fewer hands qualify).
   *
   * @returns {{ check: number, bet: number, sizes: Wager[] }}
   */
  open(position, spot, { valueShare, tuning } = {}) {
    const config = this.#config(position);
    const s = normalize(spot);
    const wagers = this.#wagers(config, s, valueShare ?? config.betValueShare, tuning);
    const bet = sum(wagers, 'frequency');
    return { check: 1 - bet, bet, sizes: wagers };
  }

  /**
   * Facing a bet or raise: fold, call and raise frequencies.
   *
   * The continuing range (calls plus raises) is the minimum defence frequency. Raises come out
   * of it, each one balanced with its own bluffs, and are dropped once `maxRaises` is reached.
   * `valueShare` is the share of hero's range strong enough to raise for value (number or
   * function of the wager).
   *
   * @returns {{ fold: number, call: number, raise: number, alpha: number, mdf: number, potOdds: number, sizes: Wager[] }}
   */
  defend(position, spot, { valueShare, tuning } = {}) {
    const config = this.#config(position);
    const s = normalize(spot);
    if (s.toCall <= 0) throw new Error('defend() needs a bet to face: spot.toCall must be positive');

    const alpha = Math.min(1, s.facing / s.pot);
    // The fundamental is the minimum defence frequency; tuning scales it for the spot
    const mdf = Math.min(1, (1 - alpha) * (tuning?.defence ?? 1));
    const canRaise = s.raises < config.maxRaises && s.stack > s.toCall;

    let wagers = [];
    if (canRaise) {
      let share = valueShare ?? config.raiseValueShare;
      if (config.raiseFrequency != null) {
        // A fixed raise frequency: value is whatever is left once the bluffs are paid for
        const total = config.raiseFrequency * mdf;
        share = (wager) => total * (1 - wager.bluffShare);
      }
      wagers = this.#wagers(config, s, share, tuning);
      // Bluff raises come out of the hands that would fold, to reach the defence frequency. Past
      // it they defend nothing more: his bluffs already make nothing. Only value may exceed it.
      const value = sum(wagers, 'value');
      const spare = Math.max(0, mdf - value);
      const bluffs = sum(wagers, 'bluff');
      if (bluffs > spare) {
        for (const w of wagers) {
          w.bluff *= spare / bluffs;
          w.frequency = w.value + w.bluff;
        }
      }
    }
    const raise = sum(wagers, 'frequency');
    const call = Math.max(0, mdf - raise);
    return {
      fold: Math.max(0, 1 - call - raise),
      call,
      raise,
      alpha,
      mdf,
      fundamental: { mdf: 1 - alpha },
      potOdds: potOdds(s.toCall, s.pot),
      sizes: wagers,
    };
  }

  /**
   * The price of putting in a bet or raise that takes hero's street total to `to`.
   *
   * @typedef {Object} Wager
   * @property {number} to          Hero's total on this street after the wager.
   * @property {number} add         Chips hero adds.
   * @property {boolean} allIn
   * @property {number} alpha       How often the opponent must fold for a pure bluff to break even.
   * @property {number} mdf         1 - alpha: how often the opponent has to continue.
   * @property {number} potOdds     Equity the opponent needs to call.
   * @property {number} bluffShare  Share of this betting range that should be bluffs.
   * @property {number} valueToBluff Value combos per bluff combo.
   * @property {number} weight      Share of hero's bets that use this size.
   * @property {number} value       Share of hero's whole range betting this size for value.
   * @property {number} bluff       Share of hero's whole range bluffing with this size.
   * @property {number} frequency   value + bluff.
   */
  wager(position, spot, to) {
    return price(this.#config(position), normalize(spot), to);
  }

  /** The geometric size for the spot, as hero's street total. */
  geometricTarget(spot) {
    return geometricTarget(normalize(spot));
  }

  // --- Internals ------------------------------------------------------------------------------

  #config(position) {
    const config = this.config[position];
    if (!config) throw new Error(`position must be 'ip' or 'oop', got ${position}`);
    return config;
  }

  /**
   * Prices every option, spreads the bets over them and adds the bluffs each size can carry.
   * `tuning` adjusts the fundamentals: `sizing` (a policy name, weights per size, or a function)
   * replaces the configured choice of size; `value` scales how much value bets; `bluff` scales
   * the bluffs each value bet carries (1 = balanced); `frequency` sets how much of the range bets
   * or raises in all, in place of counting the value hands.
   */
  #wagers(config, s, valueShare, tuning = null) {
    const max = s.invested + s.stack;
    const sizes = (s.options ?? defaultOptions(config, s))
      .map((to) => Math.min(to, max))
      .filter((to, i, all) => to > s.oppInvested && all.indexOf(to) === i)
      .sort((a, b) => a - b);
    if (!sizes.length) return [];

    const wagers = sizes.map((to) => price(config, s, to));
    const weights = sizeWeights(tuning?.sizing != null ? { ...config, sizing: tuning.sizing } : config, s, wagers);
    const valueScale = tuning?.value ?? 1;
    const bluffScale = tuning?.bluff ?? 1;

    let room = 1;
    for (const [i, w] of wagers.entries()) {
      const share = typeof valueShare === 'function' ? valueShare(w) : valueShare;
      w.weight = weights[i];
      w.candidates = Math.max(0, share);
      // A tuned frequency sets how much bets in all; the size's balance splits it into value and bluffs
      w.value = tuning?.frequency != null
        ? Math.min(room, Math.max(0, tuning.frequency) * w.weight * (1 - Math.min(1, bluffScale * w.bluffShare)))
        : Math.min(room, w.candidates * w.weight * valueScale);
      room -= w.value;
    }
    // Bluffs fill what is left of the range, biggest size first (it folds out the most)
    for (const w of [...wagers].reverse()) {
      const share = Math.min(1, tuning?.frequency != null ? bluffScale * w.bluffShare : w.bluffShare);
      const carried = tuning?.frequency != null ? 1 : bluffScale;
      w.bluff = Math.min(room, share >= 1 ? room : (carried * w.value * share) / (1 - share));
      room -= w.bluff;
      w.frequency = w.value + w.bluff;
    }
    return wagers;
  }
}

function normalize(spot) {
  const toCall = spot.toCall ?? 0;
  const invested = spot.invested ?? 0;
  const oppInvested = invested + toCall;
  if (!(spot.pot > 0)) throw new Error('spot.pot must be positive');
  if (!(spot.street in STREETS_AFTER)) throw new Error(`spot.street must be flop, turn or river, got ${spot.street}`);
  return {
    street: spot.street,
    pot: spot.pot,
    stack: spot.stack ?? Infinity,
    toCall,
    invested,
    oppInvested,
    facing: spot.facing ?? oppInvested,
    raises: spot.raises ?? 0,
    streetPot: spot.streetPot ?? spot.pot - invested - oppInvested,
    options: spot.options,
  };
}

function price(config, s, to) {
  const add = to - s.invested;
  const potAfter = s.pot + add;
  const oppToCall = to - s.oppInvested;
  const odds = potOdds(oppToCall, potAfter);
  const later = config.multiStreetBluffs
    ? futureValueFactor(potAfter + oppToCall, s.stack - add, STREETS_AFTER[s.street], config.barrelSize)
    : 1;
  const bluffShare = 1 - (1 - odds) * later;
  const alpha = add / potAfter;
  return {
    to,
    add,
    allIn: add >= s.stack,
    alpha,
    mdf: 1 - alpha,
    potOdds: odds,
    bluffShare,
    valueToBluff: bluffShare > 0 ? (1 - bluffShare) / bluffShare : Infinity,
  };
}

function defaultOptions(config, s) {
  const max = s.invested + s.stack;
  if (s.toCall > 0) return config.raiseSizes.map((x) => (x === 'allin' ? max : x * s.oppInvested));
  return config.betSizes.map((x) => (x === 'allin' ? max : x * s.pot));
}

function geometricTarget(s) {
  // Stacks and pot as they were when the street began, with both players' bets matched
  const stackAtStart = s.stack + s.invested;
  const fraction = geometricFraction(s.streetPot, stackAtStart, STREETS_AFTER[s.street] + 1);
  return fraction * s.streetPot;
}

function sizeWeights(config, s, wagers) {
  const n = wagers.length;
  const one = (index) => wagers.map((_, i) => (i === index ? 1 : 0));
  if (Array.isArray(config.sizing)) {
    // One weight per size, smallest first
    const total = config.sizing.reduce((a, b) => a + b, 0);
    return total > 0 && config.sizing.length === n ? config.sizing.map((w) => w / total) : one(0);
  }
  if (typeof config.sizing === 'function') {
    const weights = config.sizing(s, wagers);
    const total = weights.reduce((a, b) => a + b, 0);
    return total > 0 ? weights.map((w) => w / total) : one(0);
  }
  switch (config.sizing) {
    case 'smallest': return one(0);
    case 'largest': return one(n - 1);
    case 'mixed': return wagers.map(() => 1 / n);
    case 'geometric': {
      const target = geometricTarget(s);
      let best = 0;
      for (let i = 1; i < n; i++) {
        if (Math.abs(wagers[i].to - target) < Math.abs(wagers[best].to - target)) best = i;
      }
      return one(best);
    }
    default: throw new Error(`unknown sizing: ${config.sizing}`);
  }
}

function sum(items, key) {
  return items.reduce((total, item) => total + item[key], 0);
}
