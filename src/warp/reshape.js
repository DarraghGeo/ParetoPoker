import { bend } from './reshape/bend.js';
import { byEquity, divideAll } from './reshape/by-equity.js';
import { NUTS, dialsAtRest, isNeutral, isStraight } from './reshape/dials.js';

/**
 * Reshaping a real range: four dials that change how much weight its hands carry, so the same
 * spot can be solved again with a range that is stronger, more polarised, short of nut hands or
 * capped, and a curve drawn by hand. A hand is placed by its equity against the other player's
 * range as given. The dials are described in `reshape/dials.js`.
 */
export { KNOBS, NEUTRAL, neutral, NUTS, isNeutral } from './reshape/dials.js';
export { bend } from './reshape/bend.js';
export { describe } from './reshape/describe.js';

/**
 * @param {Float64Array} weights One per combination.
 * @param {Float64Array} equity Each combination's equity against the other range (NaN where it has none).
 * @param {{ edge: number, polar: number, nuts: number, cap: number }} dials
 * @returns {Float64Array} The reshaped weights, the largest no more than 1.
 */
export function reshape(weights, equity, dials) {
  if (isNeutral(dials)) return Float64Array.from(weights);
  // the hand-drawn curve first, then the dials on what it leaves
  const out = isStraight(dials) ? Float64Array.from(weights) : bend(weights, equity, dials.curve);
  if (dialsAtRest(dials)) return out;
  const { ids, total } = byEquity(out, equity);
  const most = turnDials(out, equity, dials, ids, total);
  if (most > 1) divideAll(out, ids, most);
  // never more of a hand than the range was given
  let over = 0;
  for (const i of ids) over = Math.max(over, out[i] / weights[i]);
  if (over > 1) divideAll(out, ids, over);
  return out;
}

/** Scales each hand by the dials, by where it stands in its own range (0 the weakest, 1 the strongest); the largest weight left. */
function turnDials(out, equity, dials, ids, total) {
  let seen = 0;
  let most = 0;
  for (const i of ids) {
    const rank = (seen + out[i] / 2) / total;
    seen += out[i];
    out[i] *= dialMultiple(dials, rank, equity[i]);
    if (out[i] > most) most = out[i];
  }
  return most;
}

function dialMultiple(dials, rank, equity) {
  let m = Math.exp(2.5 * dials.edge * (rank - 0.5)) * Math.exp(3 * dials.polar * (2 * Math.abs(rank - 0.5) - 0.5));
  if (equity >= NUTS) m *= dials.nuts;
  if (dials.cap < 1 && equity > dials.cap) m = 0;
  return m;
}
