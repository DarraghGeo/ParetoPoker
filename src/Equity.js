import BitVal from 'poker-bitvaljs';
import { COMBO_A, COMBO_B, NUM_COMBOS } from './cards.js';

const bitval = new BitVal();

/**
 * Per-combo equity against a weighted range, exact on the turn and river (and on the flop, by
 * enumerating both cards to come).
 *
 * On a complete board every combo is evaluated once with poker-bitvaljs and sorted by strength.
 * One pass over that order then gives each combo its wins and ties against the whole villain
 * range, with shared cards removed by inclusion-exclusion, so a call costs about as much as the
 * sort rather than hero combos x villain combos.
 */
export class Equity {
  constructor({ cacheSize = 4000 } = {}) {
    this.cacheSize = cacheSize;
    this.cache = new Map();
  }

  /**
   * @param {number[]} board 3, 4 or 5 card ids.
   * @param {Float64Array} villain Villain's weight per combo.
   * @param {Float64Array} [hero] When given, only combos with weight here are computed.
   * @returns {Float64Array} Equity per combo, 0 to 1. NaN where the combo cannot be dealt or
   *   villain has no combo left against it.
   */
  against(board, villain, hero = null) {
    const win = new Float64Array(NUM_COMBOS);
    const all = new Float64Array(NUM_COMBOS);
    if (board.length === 5) {
      this.#river(board, villain, hero, win, all);
    } else if (board.length === 4) {
      for (let card = 0; card < 52; card++) {
        if (!board.includes(card)) this.#river([...board, card], villain, hero, win, all);
      }
    } else if (board.length === 3) {
      for (let a = 0; a < 52; a++) {
        if (board.includes(a)) continue;
        for (let b = a + 1; b < 52; b++) {
          if (!board.includes(b)) this.#river([...board, a, b], villain, hero, win, all);
        }
      }
    } else {
      throw new Error('board must hold 3, 4 or 5 cards');
    }
    const equity = new Float64Array(NUM_COMBOS);
    for (let i = 0; i < NUM_COMBOS; i++) equity[i] = all[i] > 0 ? win[i] / all[i] : NaN;
    return equity;
  }

  /** Average equity of `hero` (weights per combo) against `villain`. */
  rangeEquity(board, hero, villain) {
    const equity = this.against(board, villain, hero);
    let total = 0;
    let weight = 0;
    for (let i = 0; i < NUM_COMBOS; i++) {
      if (hero[i] > 0 && !Number.isNaN(equity[i])) {
        total += hero[i] * equity[i];
        weight += hero[i];
      }
    }
    return weight > 0 ? total / weight : NaN;
  }

  /** Combos that can be dealt on a 5-card board, weakest first, with their strengths. */
  #ranking(board) {
    const key = [...board].sort((a, b) => a - b).join(',');
    let entry = this.cache.get(key);
    if (entry) return entry;

    const masks = [0, 0, 0, 0];
    const dead = new Uint8Array(52);
    for (const card of board) {
      masks[card & 3] |= 1 << (card >> 2);
      dead[card] = 1;
    }
    const values = new Int32Array(NUM_COMBOS).fill(-1);
    const live = [];
    const m = [0, 0, 0, 0];
    for (let i = 0; i < NUM_COMBOS; i++) {
      const a = COMBO_A[i];
      const b = COMBO_B[i];
      if (dead[a] || dead[b]) continue;
      m[0] = masks[0]; m[1] = masks[1]; m[2] = masks[2]; m[3] = masks[3];
      m[a & 3] |= 1 << (a >> 2);
      m[b & 3] |= 1 << (b >> 2);
      // bitval takes spades, hearts, diamonds, clubs; our suit ids are c, d, h, s
      values[i] = bitval.evaluateSuits(m[3], m[2], m[1], m[0]);
      live.push(i);
    }
    live.sort((x, y) => values[x] - values[y]);
    entry = { order: Int16Array.from(live), values };
    if (this.cache.size >= this.cacheSize) this.cache.delete(this.cache.keys().next().value);
    this.cache.set(key, entry);
    return entry;
  }

  /** Adds each combo's (wins + ties / 2) and matchup weight on one complete board. */
  #river(board, villain, hero, win, all) {
    const { order, values } = this.#ranking(board);
    const n = order.length;

    // Villain weight in total and per card, for the matchups a hero combo's cards block
    let total = 0;
    const perCard = new Float64Array(52);
    for (let k = 0; k < n; k++) {
      const w = villain[order[k]];
      if (w > 0) {
        total += w;
        perCard[COMBO_A[order[k]]] += w;
        perCard[COMBO_B[order[k]]] += w;
      }
    }
    if (total <= 0) return;

    let below = 0;
    const belowCard = new Float64Array(52);
    const tieCard = new Float64Array(52);
    for (let start = 0; start < n; ) {
      // [start, end) is a group of combos of equal strength
      const value = values[order[start]];
      let end = start;
      let tie = 0;
      while (end < n && values[order[end]] === value) {
        const w = villain[order[end]];
        if (w > 0) {
          tie += w;
          tieCard[COMBO_A[order[end]]] += w;
          tieCard[COMBO_B[order[end]]] += w;
        }
        end++;
      }
      for (let k = start; k < end; k++) {
        const i = order[k];
        if (hero && !(hero[i] > 0)) continue;
        const a = COMBO_A[i];
        const b = COMBO_B[i];
        // Villain cannot hold hero's exact combo: it was subtracted twice, once per card
        const self = villain[i];
        const matchups = total - perCard[a] - perCard[b] + self;
        if (matchups <= 1e-12) continue;
        const wins = below - belowCard[a] - belowCard[b];
        const ties = tie - tieCard[a] - tieCard[b] + self;
        win[i] += wins + ties / 2;
        all[i] += matchups;
      }
      for (let k = start; k < end; k++) {
        const w = villain[order[k]];
        if (w > 0) {
          belowCard[COMBO_A[order[k]]] += w;
          belowCard[COMBO_B[order[k]]] += w;
          tieCard[COMBO_A[order[k]]] = 0;
          tieCard[COMBO_B[order[k]]] = 0;
        }
      }
      below += tie;
      start = end;
    }
  }
}
