import { sumOf } from './HandSelector.js';
import { riverFold, riverThresholds } from './derived.js';

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
 * nearest available size, the smaller one on a tie. One size, never a split: spreading value
 * over the two sizes either side of the target lost more on a menu the target fell between
 * (TUNINGS.md).
 */
export function sizeNear(pots) {
  return (spot, wagers) => {
    const distance = (w) => Math.abs(w.add / spot.pot - pots);
    let best = 0;
    wagers.forEach((w, i) => { if (distance(w) < distance(wagers[best]) - 1e-9) best = i; });
    return wagers.map((_, i) => (i === best ? 1 : 0));
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
        // Ahead in range at this decision, the fundamental is kept
        const ahead = p.defenceWhenAhead?.[c.street];
        if (ahead && c.profile.rangeAdvantage >= ahead[0]) return { defence: ahead[1] };
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
      // Far behind in range the rule is left out and raises come from counting value, as in the fundamentals
      when: (c) => c.facing && (c.spot.raises ?? 0) === 0 && p.raise[c.street] && c.profile.rangeAdvantage >= (p.raiseFrom?.[c.street] ?? -Infinity),
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
  /** Facing a bet with a range advantage of at least the first number, continue = MDF x the second. */
  defenceWhenAhead: { river: [0.1, 1] },
  /** The raise rule applies from this range advantage up. */
  raiseFrom: { river: -0.1 },
  /** continue = MDF x this, facing a raise. On the turn the solver continues at about 1.2. */
  defenceVsRaise: { turn: { oop: 1.25, ip: 1.25 } },
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

/**
 * River tuning derived from the two ranges (src/derived.js): no numbers fitted to a solver.
 *
 * - Facing a first bet: hero folds (s + v)/(1 + s) in place of s/(1 + s), where v is what the
 *   bettor's bluff is worth when it checks. With `fold: 'prior'` v comes from the von Neumann
 *   thresholds on the bettor's range before the bet (`context.villainPrior`, right when the
 *   street began at the root of the tree); with `fold: 'range'` from the betting range alone.
 * - First to act: the range bets as often as the von Neumann thresholds say, with the thinnest
 *   value bet raised for the bluff raises he can make. `raiseMultiple` is the raise he is taken
 *   to have (his whole wager as a multiple of the bet, capped by the stack): a fact about the
 *   game, like the bet sizes.
 *
 * `size` (pots) picks one bet size as `sizeNear` does; the size itself is not derived.
 * `rules` are applied first (for example a fitted tuner's), and these override them.
 */
export function derivedTuner({ rules = [], defence = true, frequency = true, fold = 'range', raiseMultiple = 2.5, size = 0.75 } = {}) {
  const river = (context) => context.street === 'river';
  const stackPots = (context, pot) => ((context.spot.stack ?? Infinity) + (context.spot.invested ?? 0)) / pot;
  const derived = [];
  if (defence) {
    derived.push({
      when: (context) => river(context) && context.facing && (context.spot.raises ?? 0) === 0,
      set: (context) => {
        const pot = context.spot.pot - context.spot.toCall; // before his bet
        const s = context.spot.toCall / pot;
        // What his checked bluff reaches showdown with: everything in position, out of position only when hero checks behind
        const before = sumOf(context.villainPrior ?? []) > 1e-9 ? context.villainPrior : context.villain;
        const mine = () => riverThresholds({ hero: context.hero, strength: context.equityAgainst(before), villain: before, villainStrength: context.calculator.against(context.board, context.hero, before), bet: s, raiseTo: Math.min(raiseMultiple * s, stackPots(context, pot)) }).frequency;
        const behind = context.position === 'ip' ? 1 - mine() : 1;
        let folds;
        if (fold === 'prior') {
          const his = riverThresholds({ hero: before, strength: context.calculator.against(context.board, context.hero, before), villain: context.hero, villainStrength: context.equityAgainst(before), bet: s, raiseTo: Math.min(raiseMultiple * s, stackPots(context, pot)) });
          folds = Math.min(1, (s + his.bluff * behind) / (1 + s));
        } else folds = riverFold(context.villain, context.villainStrength, s, behind);
        return { defence: (1 - folds) * (1 + s) };
      },
    });
  }
  if (frequency) {
    derived.push({
      when: (context) => river(context) && !context.facing,
      set: (context) => {
        const pot = context.spot.pot;
        const sizes = context.actions.filter((a) => a.to != null).map((a) => (a.to - (context.spot.invested ?? 0)) / pot);
        if (!sizes.length) return null;
        const s = sizes.reduce((best, x) => (Math.abs(x - size) < Math.abs(best - size) - 1e-9 ? x : best), sizes[0]);
        const cuts = riverThresholds({ hero: context.hero, strength: context.strength, villain: context.villain, villainStrength: context.villainStrength, bet: s, raiseTo: Math.min(raiseMultiple * s, stackPots(context, pot)) });
        return { sizing: sizeNear(size), frequency: cuts.frequency };
      },
    });
  }
  return new Tuner([...rules, ...derived]);
}
