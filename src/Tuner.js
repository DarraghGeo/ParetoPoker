/**
 * Tuning: values that adjust the engine's frequencies for the spot and the configuration.
 *
 * ParetoEngine's frequencies are the fundamentals: what makes an opponent indifferent when
 * nothing else is known. A tuner looks at the spot (who is ahead in range, who holds the nuts,
 * how polarized each range is, how deep the stacks are, which street and seat) and returns
 * adjustments. With no tuner, or an empty answer, the engine plays the fundamentals.
 *
 * @typedef {Object} Tuning Every field is optional.
 * @property {string|number[]|Function} [sizing] Which bet or raise size to use: a policy name
 *   ('geometric', 'smallest', 'largest', 'mixed'), one weight per available size (smallest
 *   first), or a function `(spot, wagers) => weights`.
 * @property {number} [value] Scales how much of the value range bets or raises (1 = all of it).
 * @property {number} [bluff] Scales the bluffs each value bet carries (1 = balanced: the bluff
 *   share that makes a bluff catcher indifferent).
 * @property {number} [defence] Scales how often hero continues against a bet or raise (1 = the
 *   minimum defence frequency).
 * @property {number} [valueThreshold] The share of the range that continues which a hand must
 *   beat to count as value. Read by the selectors.
 *
 * @typedef {Object} TunerLike
 * @property {(context: import('./HandSelector.js').SelectionContext) => Tuning | null | undefined} tune
 */

/** The fundamentals, untouched. */
export class NoTuner {
  tune() {
    return null;
  }
}

/**
 * A tuner built from rules: each rule is `{ when, set }`, where `when(context)` says whether it
 * applies and `set` is a Tuning or a function of the context that returns one. Later rules
 * override earlier ones field by field. `context.profile` describes the spot.
 *
 * ```js
 * new Tuner([
 *   { when: (c) => c.street === 'river' && c.position === 'oop' && !c.facing, set: { sizing: 'smallest' } },
 *   { when: (c) => c.facing, set: (c) => ({ defence: 1 - 0.5 * Math.max(0, -c.profile.rangeAdvantage) }) },
 * ]);
 * ```
 */
export class Tuner {
  constructor(rules = []) {
    this.rules = rules;
  }

  tune(context) {
    let tuning = null;
    for (const rule of this.rules) {
      if (rule.when && !rule.when(context)) continue;
      const set = typeof rule.set === 'function' ? rule.set(context) : rule.set;
      if (set) tuning = { ...tuning, ...set };
    }
    return tuning;
  }
}
