import { COMBO_A, COMBO_B, NUM_COMBOS } from './cards.js';
import { runouts } from './Equity.js';

/**
 * Measures of a hand's equity beyond its average, for every combo in hero's range.
 *
 * Against his enumerated range (each villain hand taken one at a time):
 * - `spread`: how consistent the hand's equity is across his hands. 1 = the same equity against
 *   every one of them, 0 = completely different (it crushes half and is crushed by half).
 *   `1 - 2 x SD` of the matchup equities.
 * - `slope`: how fast the equity goes from its lowest to its highest across his hands. 0 = all
 *   equal, 1 = it jumps (every matchup is at the lowest or the highest, nothing between), about
 *   0.33 = it climbs evenly. The matchup equities are scaled so the lowest is 0 and the highest 1,
 *   then `variance / (mean x (1 - mean))`. On the river every matchup is won, lost or tied, so
 *   the slope there is 1 for nearly every hand and says nothing.
 *
 * With cards to come (flop and turn only):
 * - `strengthNow`: the share of his range the hand beats as it stands (ties count half).
 * - `drawEquity`: the equity the hand wins from behind: over his hands that beat it now.
 * - `swing`: how much the hand's equity moves on the next card (SD over the next cards).
 * - `ehs2`: E[HS^2], the average over every runout of the hand's river equity squared. Above
 *   equity squared by exactly the variance of its river equity: it rewards hands that end up
 *   very strong or very weak over hands that stay medium.
 * - `bestCard`: its equity on the best next card. `upside`: the average gain on the next cards
 *   that improve it. `downside`: the average loss on those that hurt it.
 * - `impliedOdds`: a proxy. `behind / (pot + behind) x (bestCard - equity)`: the equity it can
 *   still gain (the maximum, when it hits), scaled by how much is left to win relative to the
 *   pot. The stack factor grows with the stack-to-pot ratio but flattens: a deeper stack is
 *   more to win, and takes more betting to win.
 *
 * @param {Object} input
 * @param {import('./Equity.js').Equity} input.equity
 * @param {number[]} input.board Card ids.
 * @param {Float64Array} input.hero Weight per combo id: which hands to measure.
 * @param {Float64Array} input.villain Weight per combo id.
 * @param {number} [input.pot] The pot, and
 * @param {number} [input.behind] the stack left behind, once the action being judged is taken.
 * @returns {Record<string, Float64Array>} One value per combo id for each measure (NaN where
 *   it does not apply).
 */
export function handFeatures({ equity, board, hero, villain, pot = 1, behind = 0 }) {
  const heroIds = [];
  const villainIds = [];
  for (let i = 0; i < NUM_COMBOS; i++) {
    if (hero[i] > 0) heroIds.push(i);
    if (villain[i] > 0) villainIds.push(i);
  }
  const blank = () => new Float64Array(NUM_COMBOS).fill(NaN);
  const out = { equity: equity.against(board, villain, hero), spread: blank(), slope: blank() };

  const matrix = equity.matchups(board, heroIds, villainIds);
  const nv = villainIds.length;
  const made = board.length < 5 ? equity.madeValues(board) : null;
  if (made) Object.assign(out, { strengthNow: blank(), drawEquity: blank() });

  heroIds.forEach((id, h) => {
    let weight = 0, sum = 0, squares = 0, low = 1, high = 0, ahead = 0, fromBehind = 0;
    for (let v = 0; v < nv; v++) {
      const e = matrix[h * nv + v];
      if (Number.isNaN(e)) continue;
      const w = villain[villainIds[v]];
      weight += w;
      sum += w * e;
      squares += w * e * e;
      if (e < low) low = e;
      if (e > high) high = e;
      if (made) {
        const mine = made[id];
        const his = made[villainIds[v]];
        if (mine > his) ahead += w;
        else if (mine === his) ahead += w / 2;
        else fromBehind += w * e;
      }
    }
    if (!(weight > 0)) return;
    const mean = sum / weight;
    const variance = Math.max(0, squares / weight - mean * mean);
    out.spread[id] = 1 - 2 * Math.sqrt(variance);
    // Scaled so the lowest matchup is 0 and the highest 1: the variance scales by the range squared
    const range = high - low;
    const scaled = range > 0 ? (mean - low) / range : 0;
    out.slope[id] = range < 0.02 || scaled <= 0 || scaled >= 1 ? 0 : variance / (range * range) / (scaled * (1 - scaled));
    if (made) {
      out.strengthNow[id] = ahead / weight;
      out.drawEquity[id] = fromBehind / weight;
    }
  });
  if (!made) return out;

  // The next card: how the hand's equity moves
  Object.assign(out, { swing: blank(), bestCard: blank(), upside: blank(), downside: blank(), ehs2: blank(), impliedOdds: blank() });
  const count = new Float64Array(NUM_COMBOS);
  const squares = new Float64Array(NUM_COMBOS);
  const gain = new Float64Array(NUM_COMBOS);
  const loss = new Float64Array(NUM_COMBOS);
  const best = new Float64Array(NUM_COMBOS);
  for (let card = 0; card < 52; card++) {
    if (board.includes(card)) continue;
    const next = equity.against([...board, card], villain, hero);
    for (const id of heroIds) {
      if (COMBO_A[id] === card || COMBO_B[id] === card || Number.isNaN(next[id])) continue;
      const change = next[id] - out.equity[id];
      count[id]++;
      squares[id] += change * change;
      if (change > 0) gain[id] += change;
      else loss[id] -= change;
      if (next[id] > best[id]) best[id] = next[id];
    }
  }
  // Every runout: the river equity squared
  const ehs = new Float64Array(NUM_COMBOS);
  const boards = new Float64Array(NUM_COMBOS);
  for (const full of runouts(board)) {
    const river = equity.against(full, villain, hero);
    for (const id of heroIds) {
      if (Number.isNaN(river[id])) continue;
      ehs[id] += river[id] * river[id];
      boards[id]++;
    }
  }
  const stackFactor = behind > 0 ? behind / (pot + behind) : 0;
  for (const id of heroIds) {
    if (!count[id]) continue;
    out.swing[id] = Math.sqrt(squares[id] / count[id]);
    out.bestCard[id] = best[id];
    out.upside[id] = gain[id] / count[id];
    out.downside[id] = loss[id] / count[id];
    out.ehs2[id] = boards[id] ? ehs[id] / boards[id] : NaN;
    out.impliedOdds[id] = stackFactor * Math.max(0, best[id] - out.equity[id]);
  }
  return out;
}
