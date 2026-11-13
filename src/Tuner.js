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
 * @property {number} [frequency] How much of the range bets or raises in all (0 to 1), in place of
 *   counting the hands that qualify as value. The size's balance still splits it into value and
 *   bluffs, and the selector's order still says which hands.
 * @property {number} [value] Scales how much of the value range bets or raises (1 = all of it).
 * @property {number} [bluff] Scales the bluffs each value bet carries (1 = balanced: the bluff
 *   share that makes a bluff catcher indifferent).
 * @property {number} [defence] Scales how often hero continues against a bet or raise (1 = the
 *   minimum defence frequency).
 * @property {number} [hisDefence] Scales how often the opponent is assumed to continue against
 *   hero's bet (1 = the minimum defence frequency). Read by the selectors, which judge value
 *   against the range that continues.
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
 * applies and `set` is a Tuning or a function `(context, tuningSoFar)` that returns one. Later rules
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
      const set = typeof rule.set === 'function' ? rule.set(context, tuning) : rule.set;
      if (set) tuning = { ...tuning, ...set };
    }
    return tuning;
  }
}

/**
 * A sizing for `Tuning.sizing` that aims at a bet of `pots` pots: all of the weight on the
 * nearest available size, or split between the two sizes either side of the target.
 */
export function sizeNear(pots) {
  return (spot, wagers) => {
    const size = (w) => w.add / spot.pot;
    const weights = wagers.map(() => 0);
    const above = wagers.findIndex((w) => size(w) >= pots);
    if (above === 0) weights[0] = 1;
    else if (above < 0) weights[wagers.length - 1] = 1;
    else {
      const low = size(wagers[above - 1]);
      const high = size(wagers[above]);
      weights[above] = (pots - low) / (high - low);
      weights[above - 1] = 1 - weights[above];
    }
    return weights;
  };
}

const clamp = (x, low, high) => Math.max(low, Math.min(high, x));

/**
 * The tuner fitted to the solver (see TUNINGS.md). Each rule is a formula in how the spot is
 * defined; `params` replaces any of the fitted numbers.
 */
export function fittedTuner(params = {}) {
  const p = { ...FITTED };
  for (const [key, value] of Object.entries(params)) if (value !== undefined) p[key] = value;
  // A tuner always answers, so that frequencies are always filled (see SelectionContext#floor)
  const rules = [{ set: {} }];
  // Facing a bet (not a raise) the solver continues less than the minimum defence frequency, and
  // less still the further behind in range it is. Facing a raise it plays the fundamental.
  if (p.defence) {
    rules.push({
      when: (c) => c.facing && (c.spot.raises ?? 0) === 0 && p.defence[c.street],
      set: (c) => {
        const [base, slope, low, high] = p.defence[c.street][c.position];
        return { defence: clamp(base + slope * c.profile.rangeAdvantage, low, high) };
      },
    });
  }
  // Facing a raise with cards to come the solver continues more than the fundamental: the
  // raiser's bluffs have equity and hero's calls keep theirs
  if (p.defenceVsRaise) {
    rules.push({
      when: (c) => c.facing && (c.spot.raises ?? 0) > 0 && p.defenceVsRaise[c.street]?.[c.position] != null,
      set: (c) => ({ defence: p.defenceVsRaise[c.street][c.position] }),
    });
  }
  // When hero bets or raises, the opponent is assumed to defend by the same formula, from his side
  if (p.hisDefence) {
    rules.push({
      when: (c) => !c.facing && p.hisDefence[c.street],
      set: (c) => {
        const [base, slope, low, high] = p.hisDefence[c.street][c.position === 'ip' ? 'oop' : 'ip'];
        return { hisDefence: clamp(base - slope * c.profile.rangeAdvantage, low, high) };
      },
    });
  }
  // How much of the continuing range raises: more the more polarized hero's range is against his
  if (p.raise) {
    rules.push({
      when: (c) => c.facing && (c.spot.raises ?? 0) === 0 && p.raise[c.street],
      set: (c, tuning) => {
        const [base, polarization, spr, low, high] = p.raise[c.street][c.position];
        const share = clamp(base + polarization * c.profile.polarization + spr * Math.min(c.profile.spr, 5), low, high);
        const mdf = 1 - c.spot.facing / c.spot.pot;
        return { frequency: share * mdf * (tuning?.defence ?? 1) };
      },
    });
  }
  // First to act: which size to aim at (in pots) and how much of his continues value must beat
  if (p.open) {
    rules.push({
      when: (c) => !c.facing && p.open[c.street]?.[c.position] && c.profile.rangeAdvantage >= (p.open[c.street][c.position].ahead ?? -Infinity),
      set: (c) => {
        const { size, valueThreshold } = p.open[c.street][c.position];
        return { ...(size != null ? { sizing: sizeNear(size) } : {}), ...(valueThreshold != null ? { valueThreshold } : {}) };
      },
    });
  }
  // Which size: a target in pots from the seat and the nut advantage
  if (p.size) {
    rules.push({
      when: (c) => !c.facing && p.size[c.street],
      set: (c) => {
        const [base, slope, low, high] = p.size[c.street][c.position];
        return { sizing: sizeNear(clamp(base + slope * c.profile.nutAdvantage, low, high)) };
      },
    });
  }
  // How often to bet: from range, nut and polarization advantage
  if (p.bet) {
    rules.push({
      when: (c) => !c.facing && p.bet[c.street]?.[c.position],
      set: (c) => {
        const [base, range, nut, polarization, low, high] = p.bet[c.street][c.position];
        const { rangeAdvantage, nutAdvantage, polarizationAdvantage } = c.profile;
        return { frequency: clamp(base + range * rangeAdvantage + nut * nutAdvantage + polarization * polarizationAdvantage, low, high) };
      },
    });
  }
  return new Tuner(rules);
}

/** Fitted numbers, by street and seat. null turns a rule off. */
export const FITTED = {
  /** continue = MDF x (base + slope x range advantage), kept within [low, high]. */
  defence: { river: { oop: [0.95, 0, 0, 1.1], ip: [0.95, 0, 0, 1.1] } },
  /** continue = MDF x this, facing a raise. */
  defenceVsRaise: null,
  /** The same for the opponent's answer to hero's bet, by the opponent's seat. */
  hisDefence: { river: { oop: [1, 0, 0, 1.1], ip: [1, 0, 0, 1.1] } },
  /** raises = continue x (base + a x hero's polarization + b x stack-to-pot), within [low, high]. */
  raise: { river: { oop: [-0.02, 0.21, 0.08, 0, 0.5], ip: [-0.25, 1.47, 0.01, 0, 0.6] } },
  /**
   * First to act: the bet size aimed at, in pots, and the value threshold. `ahead` applies the
   * rule only when hero's range advantage is at least that much: out of position and behind in
   * range, the thinner, smaller bets lose (see TUNINGS.md).
   */
  open: { river: { oop: { size: 0.75, valueThreshold: 0.6, ahead: 0.03 }, ip: { size: 0.75, valueThreshold: 0.6 } } },
  /** Fitted to the solver but not adopted: they lose more to the best response (TUNINGS.md). */
  size: null,
  bet: null,
};
