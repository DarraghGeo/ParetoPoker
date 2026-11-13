import { NUM_COMBOS } from './cards.js';
import { Range } from './Range.js';
import { handFeatures } from './handFeatures.js';

/**
 * The connector for choosing hands.
 *
 * ParetoEngine decides how much of the range bets for value, calls and bluffs. A selector
 * decides which hands those are. RangeStrategist asks it three questions per decision:
 *
 * - `value(context, wager)`: which hands may bet or raise this size for value?
 * - `call(context)`: which hands may call?
 * - `bluff(context, wager)`: which hands may bluff with this size?
 *
 * Each answer is a set of candidates (see {@link Candidates}). The strategist takes hands from
 * it, best first, until the engine's frequency is filled. A selector may implement any of the
 * three; a missing method, or one that returns null or undefined, falls back to EquitySelector.
 *
 * @typedef {string | string[] | Record<string, number> | Float64Array | number[] | CandidateOptions} Candidates
 *   - Range notation: `'QQ+,AKs,JTs:0.5'`. A weight caps how often the hand takes the role.
 *     Within the set, hands are taken in the default (equity) order.
 *   - An object of weights: `{ AhKh: 1, QsQd: 0.5 }`. As above.
 *   - A list in priority order: `['AhKh', 'QQ', '76s']`. Earlier entries are taken first.
 *   - A score per combo id (length 1326): higher is taken first, NaN is not a candidate.
 *   - `{ hands, share }` to also set how much of the range takes the role.
 *
 * @typedef {Object} CandidateOptions
 * @property {string | string[] | Record<string, number> | Float64Array | number[]} hands
 * @property {number} [share] The share of hero's range that takes this role, instead of the
 *   engine's number. For value, the engine sizes the bluffs from it. Leave it out to keep the
 *   engine's frequencies.
 * @property {Float64Array} [limit] With scores: the most each combo may take the role, 0 to 1
 *   per combo id.
 *
 * @typedef {Object} HandSelector
 * @property {(context: SelectionContext, wager: Object) => Candidates | null | undefined} [value]
 * @property {(context: SelectionContext) => Candidates | null | undefined} [call]
 * @property {(context: SelectionContext, wager: Object) => Candidates | null | undefined} [bluff]
 */

/**
 * The default selector, on equity alone: value bet the hands with the most equity, bluff the
 * hands with the least, call with the best of the rest.
 */
export class EquitySelector {
  /**
   * @param {Object} [options]
   * @param {number} [options.valueThreshold] Equity against the range that continues which a
   *   hand needs to bet or raise for value. Default 0.5.
   * @param {number} [options.callFloor] A hand only calls (and villain is only assumed to
   *   continue) with at least this share of the pot odds in equity. Against a balanced bet a bluff
   *   catcher has exactly the pot odds, so a hand far below them loses to the bluffs too. A range
   *   with too few such hands defends less than the minimum defence frequency. 0 turns it off.
   */
  constructor({ valueThreshold = 0.5, callFloor = 0.5 } = {}) {
    this.valueThreshold = valueThreshold;
    this.callFloor = callFloor;
  }

  /** Hands ahead of the part of villain's range that continues against this size, best first. */
  value(context, wager) {
    const equity = context.equityVersusContinuing(wager, context.floor(this.callFloor, wager.potOdds));
    const threshold = context.tuning?.valueThreshold ?? this.valueThreshold;
    return equity.map((e) => (e > threshold ? e : NaN));
  }

  /** Hands with enough equity against villain's range to catch a bluff, best first. */
  call(context) {
    const floor = context.floor(this.callFloor, context.potOdds);
    return context.strength.map((e) => (e >= floor ? e : NaN));
  }

  /** Every hand, the least equity first. */
  bluff(context) {
    return context.strength.map((e) => -e);
  }
}

/**
 * What a selector is told about the decision. Equity is computed on first use and shared.
 */
export class SelectionContext {
  constructor({ equity, position, spot, board, hero, villain, villainPrior = null, actions }) {
    this.calculator = equity;
    /** @type {'ip'|'oop'} */
    this.position = position;
    /** The spot: street, pot, stack, toCall, invested, facing, raises. */
    this.spot = spot;
    this.street = spot.street;
    /** Board card ids. */
    this.board = board;
    /** Hero's and villain's weight per combo id. */
    this.hero = hero;
    this.villain = villain;
    /** Villain's range before any action on the hand (board cards removed), when the caller knows it. */
    this.villainPrior = villainPrior;
    /** The actions hero may take. */
    this.actions = actions;
    /** True when hero faces a bet or raise. */
    this.facing = (spot.toCall ?? 0) > 0;
    /** Equity hero needs to call (0 when not facing a bet). */
    this.potOdds = this.facing ? spot.toCall / (spot.pot + spot.toCall) : 0;
    /** The engine's frequencies. Set once the value hands are known, so not yet in value(). */
    this.frequencies = null;
    /** The tuner's answer for this decision (see Tuner.js), or null. */
    this.tuning = null;
  }

  /**
   * How the spot is defined, range against range:
   * - `rangeAdvantage`: hero's average equity minus villain's (positive = hero is ahead).
   * - `nutShare`, `villainNutShare`: the share of each range with 90% equity or more against
   *   the other; `nutAdvantage` is the difference.
   * - `polarization`, `villainPolarization`: 1 = every hand is nuts or air against the other
   *   range, 0 = every hand has the same equity; `polarizationAdvantage` is the difference.
   * - `spr`: hero's stack behind over the pot. Plus `street`, `position` and `facing`.
   */
  get profile() {
    if (this.cachedProfile) return this.cachedProfile;
    const side = (weights, equity) => {
      let total = 0, sum = 0, squares = 0, nuts = 0;
      for (let i = 0; i < NUM_COMBOS; i++) {
        const w = weights[i];
        const e = equity[i];
        if (!(w > 0) || Number.isNaN(e)) continue;
        total += w;
        sum += w * e;
        squares += w * e * e;
        if (e >= 0.9) nuts += w;
      }
      const mean = total > 0 ? sum / total : 0.5;
      const variance = total > 0 ? Math.max(0, squares / total - mean * mean) : 0;
      return { mean, nuts: total > 0 ? nuts / total : 0, polarization: mean > 0 && mean < 1 ? variance / (mean * (1 - mean)) : 0 };
    };
    const hero = side(this.hero, this.strength);
    const villain = side(this.villain, this.villainStrength);
    this.cachedProfile = {
      street: this.street,
      position: this.position,
      facing: this.facing,
      spr: (this.spot.stack ?? Infinity) / this.spot.pot,
      equity: hero.mean,
      rangeAdvantage: hero.mean - villain.mean,
      nutShare: hero.nuts,
      villainNutShare: villain.nuts,
      nutAdvantage: hero.nuts - villain.nuts,
      polarization: hero.polarization,
      villainPolarization: villain.polarization,
      polarizationAdvantage: hero.polarization - villain.polarization,
    };
    return this.cachedProfile;
  }

  /** Each combo's equity against villain's range. */
  get strength() {
    return (this.cachedStrength ??= this.calculator.against(this.board, this.villain));
  }

  /**
   * Each combo's equity against the range villain started the hand with. `strength` rests on a
   * model of how villain got here; this does not. The same as `strength` when no prior is known.
   */
  get priorStrength() {
    if (!this.villainPrior) return this.strength;
    return (this.cachedPriorStrength ??= this.calculator.against(this.board, this.villainPrior, this.hero));
  }

  /**
   * The forms of equity for every hand in hero's range (see handFeatures): spread and slope
   * against his enumerated range and, with cards to come, strength now, draw equity, swing,
   * E[HS^2], best-card equity and the implied-odds proxy (for the stack as it is now).
   */
  get features() {
    return (this.cachedFeatures ??= handFeatures({
      equity: this.calculator, board: this.board, hero: this.hero, villain: this.villain,
      pot: this.spot.pot, behind: this.spot.stack ?? 0,
    }));
  }

  /** Each villain combo's equity against hero's range. */
  get villainStrength() {
    return (this.cachedVillainStrength ??= this.calculator.against(this.board, this.hero, this.villain));
  }

  /** Each combo's equity against any range (weights per combo id). */
  equityAgainst(range) {
    return this.calculator.against(this.board, range, this.hero);
  }

  /**
   * The part of villain's range expected to continue against a wager: their strongest hands up
   * to the wager's defence frequency, leaving out hands with less than `floor` equity.
   */
  continuingRange(wager, floor = 0) {
    // The fundamental is the minimum defence frequency; a tuner may say he defends more or less
    return topShare(this.villain, this.villainStrength, Math.min(1, wager.mdf * (this.tuning?.hisDefence ?? 1)), floor);
  }

  /**
   * The equity a hand needs before a selector's own floor lets it call or count as continuing:
   * `share` of the pot odds. With a tuner there is no floor: how often to defend is the tuner's
   * to say, and the selector only orders the hands.
   */
  floor(share, potOdds) {
    return this.tuning ? 0 : share * potOdds;
  }

  /** Each combo's equity against continuingRange(wager, floor). */
  equityVersusContinuing(wager, floor = 0) {
    return this.equityAgainst(this.continuingRange(wager, floor));
  }
}

/**
 * Turns any form of {@link Candidates} into a score per combo (NaN = not a candidate), an
 * optional cap per combo and an optional share. `tiebreak` orders hands the answer does not.
 */
export function normalizeCandidates(answer, tiebreak) {
  let share;
  let cap = null;
  if (answer && typeof answer === 'object' && !Array.isArray(answer) && !ArrayBuffer.isView(answer) && 'hands' in answer) {
    share = answer.share;
    cap = answer.limit ?? null;
    answer = answer.hands;
  }
  const scores = new Float64Array(NUM_COMBOS).fill(NaN);

  if ((ArrayBuffer.isView(answer) || Array.isArray(answer)) && answer.length === NUM_COMBOS && typeof answer[0] === 'number') {
    scores.set(answer);
    return { scores, limit: cap, share };
  }
  const limit = new Float64Array(NUM_COMBOS);
  if (Array.isArray(answer)) {
    // Priority order: the first entry that names a combo sets its place
    answer.forEach((entry, place) => {
      const { weights } = Range.from(typeof entry === 'string' ? entry : [entry]);
      for (let i = 0; i < NUM_COMBOS; i++) {
        if (weights[i] > 0 && Number.isNaN(scores[i])) {
          scores[i] = answer.length - place;
          limit[i] = weights[i];
        }
      }
    });
    return { scores, limit, share };
  }
  if (typeof answer === 'string' || (answer && typeof answer === 'object')) {
    const { weights } = Range.from(answer);
    for (let i = 0; i < NUM_COMBOS; i++) {
      if (weights[i] > 0) {
        scores[i] = Number.isNaN(tiebreak[i]) ? -Infinity : tiebreak[i];
        limit[i] = weights[i];
      }
    }
    return { scores, limit, share };
  }
  throw new Error('a selector must return range notation, a list of hands, an object of weights, a score per combo, or { hands, share }');
}

export function sumOf(weights) {
  let total = 0;
  for (const w of weights) total += w;
  return total;
}

/** Combos with weight and a score, highest score first. */
export function candidatesInOrder(scores, weights) {
  const order = [];
  for (let i = 0; i < NUM_COMBOS; i++) if (weights[i] > 0 && !Number.isNaN(scores[i])) order.push(i);
  return order.sort((a, b) => scores[b] - scores[a]);
}

/**
 * Gives `target` combo weight to `out`, walking `order` and using each combo's unused
 * probability in `left` (at most `limit[combo]`). Combos with the same score share the last
 * slice evenly, so the result does not depend on how ties happen to be ordered (and stays the
 * same across equivalent suits). Returns the weight it could not place.
 */
export function deal(order, scores, weights, left, out, target, limit = null) {
  const room = (i) => (limit ? Math.min(left[i], limit[i]) : left[i]);
  let remaining = target;
  for (let start = 0; start < order.length && remaining > 1e-12; ) {
    let end = start;
    let available = 0;
    const value = scores[order[start]];
    while (end < order.length && (scores[order[end]] === value || Math.abs(scores[order[end]] - value) < 1e-9)) {
      available += weights[order[end]] * room(order[end]);
      end++;
    }
    const fraction = available <= remaining ? 1 : remaining / available;
    for (let k = start; k < end; k++) {
      const i = order[k];
      const taken = room(i) * fraction;
      out[i] += taken;
      left[i] -= taken;
    }
    remaining -= available * fraction;
    start = end;
  }
  return Math.max(0, remaining);
}

/** The strongest `share` of a range, as weights, from hands scoring at least `floor`. */
function topShare(weights, scores, share, floor) {
  const eligible = scores.map((s) => (s >= floor ? s : NaN));
  const picked = new Float64Array(NUM_COMBOS);
  deal(candidatesInOrder(eligible, weights), eligible, weights, new Float64Array(NUM_COMBOS).fill(1), picked, share * sumOf(weights));
  return picked.map((p, i) => p * weights[i]);
}
