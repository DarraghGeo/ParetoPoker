import { NUM_COMBOS } from './cards.js';

/**
 * Mixing: how often a hand takes a role it is a candidate for.
 *
 * The selector orders hands and the engine says how much of the range takes each action. Dealt
 * out on their own, every hand takes one action. A mixer caps how often a hand may take a role,
 * so that the rest of the time it does something else: the strongest hands sometimes check, some
 * bluff catchers sometimes fold. 1 means the hand plays the role whenever it is dealt it (pure);
 * 0.6 means at most 60% of the time.
 *
 * @typedef {Object} MixerLike
 * @property {(context: import('./HandSelector.js').SelectionContext, role: 'value'|'call'|'bluff', wager?: Object)
 *   => Float64Array | number | null | undefined} mix
 *   The most each combo may take the role: one number per combo id, one number for every hand,
 *   or nothing for pure.
 */

/** Every hand plays pure. */
export class PureMixer {
  mix() {
    return null;
  }
}

/**
 * A mixer built from rules: each rule is `{ when, role, share }`. `when(context, wager)` says
 * whether it applies, `role` is 'value', 'call' or 'bluff' (or left out for all), and `share` is
 * how often the hand takes the role: a number for every hand, or a function
 * `(context, wager) => number | Float64Array` (one value per combo id). Where several rules
 * apply, a hand gets the lowest share.
 *
 * ```js
 * // Out of position on the turn, every value hand checks 40% of the time
 * new Mixer([{ role: 'value', when: (c) => c.position === 'oop' && c.street === 'turn' && !c.facing, share: 0.6 }]);
 * ```
 */
export class Mixer {
  constructor(rules = []) {
    this.rules = rules;
  }

  mix(context, role, wager) {
    let caps = null;
    for (const rule of this.rules) {
      if (rule.role && rule.role !== role) continue;
      if (rule.when && !rule.when(context, wager)) continue;
      const share = typeof rule.share === 'function' ? rule.share(context, wager) : rule.share;
      if (share == null) continue;
      caps ??= new Float64Array(NUM_COMBOS).fill(1);
      for (let i = 0; i < NUM_COMBOS; i++) caps[i] = Math.min(caps[i], typeof share === 'number' ? share : share[i]);
    }
    return caps;
  }
}

/** The caps a mixer returned, as one value per combo id (or null for pure). */
export function capsOf(answer) {
  if (answer == null) return null;
  return typeof answer === 'number' ? new Float64Array(NUM_COMBOS).fill(answer) : answer;
}
