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
 *   or nothing for pure. *
 * A mixer may also have `direct(context, frequencies)`: how often each hand bets or raises at
 * this decision, one probability per combo id, in place of dealing an order under caps. Used
 * where the solver's play is a level over kinds of hand rather than an order (see KindMixer).
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

/** The rank bands of a kind table unless it brings its own: shares of the range by strength now. */
const RANKS = [0, 0.2, 0.4, 0.6, 0.8, 0.9, 1];

/**
 * Mixing by kind of hand, for decisions with cards to come and no bet to face.
 *
 * A hand's kind is how strong it is right now, as a rank within hero's range (in bands), and
 * what it is drawing to (none, gutshot, strong draw, nut draw). `tables[street][position]` is
 * `[draw][band]`: how often that kind bets relative to how often the whole range bets, which is
 * taken from the engine's frequencies (or `level(context, frequencies)` when given). A table may
 * be `{ bands, table }` to bring its own band edges. Every hand of a kind bets equally often:
 * the hands of a kind are treated as interchangeable.
 *
 * `rules` are ordinary Mixer rules for every other decision.
 */
export class KindMixer extends Mixer {
  constructor({ tables, level = null, rules = [] }) {
    super(rules);
    Object.assign(this, { tables, level });
  }

  direct(context, frequencies) {
    if (context.facing) return this.#facing(context, frequencies);
    const entry = this.tables[context.street]?.[context.position];
    if (!entry) return null;
    const table = entry.table ?? entry;
    const bands = entry.bands ?? RANKS;
    // With no cards to come, strength now is the hand's equity
    const strengthNow = context.street === 'river' ? context.strength : context.features.strengthNow;
    const draws = context.kinds.draw;
    // Rank of each hand within the range by strength now
    const order = [];
    let total = 0;
    for (let i = 0; i < NUM_COMBOS; i++) {
      if (context.hero[i] > 0 && !Number.isNaN(strengthNow[i])) {
        order.push(i);
        total += context.hero[i];
      }
    }
    order.sort((a, b) => strengthNow[a] - strengthNow[b]);
    const level = Math.min(1, Math.max(0, this.level ? this.level(context, frequencies) : frequencies.bet));
    const out = new Float64Array(NUM_COMBOS);
    let seen = 0;
    let sum = 0;
    for (const i of order) {
      const rank = (seen + context.hero[i] / 2) / total;
      seen += context.hero[i];
      let band = bands.length - 2;
      while (band > 0 && rank < bands[band]) band--;
      // A cell is how often the kind bets relative to the level, or `[a, b]` for a + b x level
      const cell = (table[draws[i]] ?? table[0])[band];
      out[i] = Array.isArray(cell) ? Math.max(0, cell[0] + cell[1] * level) : cell;
      sum += context.hero[i] * out[i];
    }
    // Scale so that the range bets `level` in all (the table is relative), capping each hand at 1
    let scale = sum > 0 ? (level * total) / sum : 0;
    for (let pass = 0; pass < 20; pass++) {
      let got = 0;
      for (const i of order) got += context.hero[i] * Math.min(1, out[i] * scale);
      if (got <= 0 || Math.abs(got - level * total) < 1e-6 * total) break;
      scale *= (level * total) / got;
    }
    for (const i of order) out[i] = Math.min(1, out[i] * scale);
    return out;
  }

  /**
   * Facing a first bet: `tables.facing[street][position]` is `{ continue, raise }`, each
   * `[draw][band]`, with optional `bands` (edges) and `by` (the measure hands are ranked by, a
   * name from handFeatures such as 'ehs2'). The continue table is scaled so the range continues as often as the engine
   * says, the raise table so it raises as often; a hand calls the difference.
   */
  #facing(context, frequencies) {
    const entry = (context.spot.raises ?? 0) === 0 ? this.tables.facing?.[context.street]?.[context.position] : null;
    if (!entry) return null;
    // The measure the kinds are ranked by: strength now unless the table names another (`by`)
    const measure = context.street === 'river' ? context.strength : context.features[entry.by ?? 'strengthNow'];
    const strengthNow = measure;
    const bands = entry.bands ?? RANKS;
    const draws = context.kinds.draw;
    const order = [];
    let total = 0;
    for (let i = 0; i < NUM_COMBOS; i++) {
      if (context.hero[i] > 0 && !Number.isNaN(strengthNow[i])) {
        order.push(i);
        total += context.hero[i];
      }
    }
    order.sort((a, b) => strengthNow[a] - strengthNow[b]);
    const band = new Map();
    let seen = 0;
    for (const i of order) {
      const rank = (seen + context.hero[i] / 2) / total;
      seen += context.hero[i];
      let k = bands.length - 2;
      while (k > 0 && rank < bands[k]) k--;
      band.set(i, k);
    }
    const fit = (table, level) => {
      const raw = new Float64Array(NUM_COMBOS);
      for (const i of order) raw[i] = (table[draws[i]] ?? table[0])[band.get(i)];
      let scale = 1;
      for (let pass = 0; pass < 20; pass++) {
        let got = 0;
        for (const i of order) got += context.hero[i] * Math.min(1, raw[i] * scale);
        if (got <= 0 || Math.abs(got - level * total) < 1e-6 * total) break;
        scale *= (level * total) / got;
      }
      for (const i of order) raw[i] = Math.min(1, raw[i] * scale);
      return raw;
    };
    const continues = fit(entry.continue, Math.min(1, frequencies.call + frequencies.raise));
    const aggressive = fit(entry.raise, frequencies.raise);
    const call = new Float64Array(NUM_COMBOS);
    for (const i of order) {
      aggressive[i] = Math.min(aggressive[i], continues[i]);
      call[i] = continues[i] - aggressive[i];
    }
    return { aggressive, call };
  }
}

/**
 * The solver's answer to a first turn bet on the tuning spots, by kind: how often it continues
 * and how often it raises, `[draw][rank band]` as in TURN_KINDS. Draws continue whatever they
 * are now; hands with no draw continue from about the middle of the range up.
 */
export const TURN_FACING_KINDS = { turn: {
  oop: {
    continue: [[0.02, 0.21, 0.43, 0.85, 0.99, 1], [0.29, 0.55, 0.70, 0.88, 1, 1], [0.52, 0.83, 0.84, 1, 1, 1], [1, 1, 1, 1, 1, 1]],
    raise: [[0, 0.01, 0.05, 0.06, 0.25, 0.46], [0.12, 0.08, 0.03, 0.09, 0.48, 0.48], [0.14, 0.11, 0.09, 0.16, 0.46, 0.46], [0.47, 0.25, 0.22, 0.13, 0.13, 0.13]],
  },
  ip: {
    continue: [[0.03, 0.20, 0.49, 0.83, 0.95, 1], [0.44, 0.64, 0.68, 0.98, 1, 1], [0.53, 0.68, 1, 1, 1, 1], [0.79, 0.86, 1, 1, 1, 1]],
    raise: [[0.02, 0.02, 0.03, 0.14, 0.19, 0.21], [0.09, 0.10, 0.06, 0.14, 0.39, 0.39], [0.06, 0.08, 0.06, 0.24, 0.76, 0.76], [0.09, 0.11, 0.12, 0.41, 0.41, 0.41]],
  },
} };

/**
 * The solver's turn opening play on 48 turn spots (turns-tune and turns-more), relative to how
 * often it bets:
 * `[draw][rank band]`, bands 0-20%, 20-40%, 40-60%, 60-80%, 80-90%, 90-100% of the range by
 * strength now. From diagnosis/open-table.mjs; empty cells take a neighbour's value.
 */
export const TURN_KINDS = { turn: {
  oop: [
    [0.55, 0.27, 0.25, 0.88, 1.69, 1.52],
    [1.80, 1.02, 0.46, 0.91, 2.81, 2.94],
    [2.99, 1.15, 0.35, 1.34, 2.68, 2.78],
    [2.67, 1.16, 0.21, 0.35, 0.35, 0.35],
  ],
  ip: [
    [1.32, 0.60, 0.26, 0.80, 1.45, 1.99],
    [1.25, 0.89, 0.41, 0.91, 1.95, 1.81],
    [1.24, 1.16, 0.41, 1.32, 2.10, 2.29],
    [1.43, 1.42, 1.01, 1.47, 1.47, 1.47],
  ],
} };
