import { RangeManager } from 'poker-rangeman';
import { COMBO_A, COMBO_B, NUM_COMBOS, comboName, parseCards, parseCombo } from './cards.js';

/** A weighted range: one weight (0 to 1 at the start of a hand, a reach after that) per combo. */
export class Range {
  /** @param {Float64Array} [weights] One weight per combo id. */
  constructor(weights = new Float64Array(NUM_COMBOS)) {
    this.weights = weights;
  }

  /** From notation ('QQ+,AKs,JTs:0.5'), exact hands, or an object of weights, via poker-rangeman. */
  static from(input) {
    if (input instanceof Range) return input.clone();
    const range = new Range();
    for (const [hand, weight] of Object.entries(new RangeManager(input).weights())) {
      range.weights[parseCombo(hand)] = weight;
    }
    return range;
  }

  clone() {
    return new Range(Float64Array.from(this.weights));
  }

  /** Total combo weight. */
  total() {
    let total = 0;
    for (const w of this.weights) total += w;
    return total;
  }

  /** A copy with the combos that hold any of `cards` removed. */
  without(cards) {
    const dead = new Uint8Array(52);
    for (const card of parseCards(cards)) dead[card] = 1;
    const out = this.clone();
    for (let i = 0; i < NUM_COMBOS; i++) {
      if (dead[COMBO_A[i]] || dead[COMBO_B[i]]) out.weights[i] = 0;
    }
    return out;
  }

  /** A copy with each combo's weight multiplied by its entry in `factors`. */
  times(factors) {
    const out = this.clone();
    for (let i = 0; i < NUM_COMBOS; i++) out.weights[i] *= factors[i];
    return out;
  }

  /** { AhKd: 1, ... } for every combo with weight. */
  toObject() {
    const out = {};
    for (let i = 0; i < NUM_COMBOS; i++) {
      if (this.weights[i] > 0) out[comboName(i)] = this.weights[i];
    }
    return out;
  }

  /** Notation for the range, via poker-rangeman. */
  toString() {
    const hands = Object.entries(this.toObject()).map(([hand, w]) => (w >= 1 ? hand : `${hand}:${+w.toFixed(4)}`));
    return hands.length ? new RangeManager(hands).toNotation() : '';
  }
}
