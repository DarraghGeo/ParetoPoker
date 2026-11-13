/**
 * Reshaping a real range: four dials that change how much weight its hands carry, so the same
 * spot can be solved again with a range that is stronger, more polarised, short of nut hands or
 * capped. A hand is placed by its equity against the other player's range as given.
 *
 * - `edge` (-1 to 1): weight moves toward the strong hands (positive) or the weak ones.
 * - `polar` (-1 to 1): weight moves to both ends (positive) or to the middle.
 * - `nuts` (0 to 2): the weight of the hands with 90% equity or more, as a multiple.
 * - `cap` (0.5 to 1): hands with more equity than this are taken out. 1: no cap.
 */
export const NEUTRAL = Object.freeze({ edge: 0, polar: 0, nuts: 1, cap: 1 });
export const NUTS = 0.9;

export const isNeutral = (w) => !w || (w.edge === 0 && w.polar === 0 && w.nuts === 1 && w.cap >= 1);

/**
 * @param {Float64Array} weights One per combination.
 * @param {Float64Array} equity Each combination's equity against the other range (NaN where it has none).
 * @param {{ edge: number, polar: number, nuts: number, cap: number }} dials
 * @returns {Float64Array} The reshaped weights, the largest no more than 1.
 */
export function reshape(weights, equity, dials) {
  const out = Float64Array.from(weights);
  if (isNeutral(dials)) return out;
  // where each hand stands in its own range, 0 the weakest and 1 the strongest
  const ids = [];
  let total = 0;
  for (let i = 0; i < out.length; i++) if (out[i] > 0 && !Number.isNaN(equity[i])) { ids.push(i); total += out[i]; }
  ids.sort((a, b) => equity[a] - equity[b]);
  let seen = 0;
  let most = 0;
  for (const i of ids) {
    const rank = (seen + out[i] / 2) / total;
    seen += out[i];
    let m = Math.exp(2.5 * dials.edge * (rank - 0.5)) * Math.exp(3 * dials.polar * (2 * Math.abs(rank - 0.5) - 0.5));
    if (equity[i] >= NUTS) m *= dials.nuts;
    if (dials.cap < 1 && equity[i] > dials.cap) m = 0;
    out[i] *= m;
    if (out[i] > most) most = out[i];
  }
  if (most > 1) for (const i of ids) out[i] /= most;
  return out;
}

/** What a range looks like against the other: its equity, its share of nut hands, how polarised it is, its best hand. */
export function describe(weights, equity) {
  let total = 0, sum = 0, squares = 0, nuts = 0, top = 0;
  for (let i = 0; i < weights.length; i++) {
    const w = weights[i];
    const e = equity[i];
    if (!(w > 0) || Number.isNaN(e)) continue;
    total += w; sum += w * e; squares += w * e * e;
    if (e >= NUTS) nuts += w;
    if (e > top) top = e;
  }
  if (!(total > 0)) return { equity: 0, nuts: 0, polar: 0, top: 0 };
  const mean = sum / total;
  const variance = Math.max(0, squares / total - mean * mean);
  return { equity: mean, nuts: nuts / total, polar: mean > 0 && mean < 1 ? variance / (mean * (1 - mean)) : 0, top };
}
