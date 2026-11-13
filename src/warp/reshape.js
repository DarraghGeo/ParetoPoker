/**
 * Reshaping a real range: four dials that change how much weight its hands carry, so the same
 * spot can be solved again with a range that is stronger, more polarised, short of nut hands or
 * capped. A hand is placed by its equity against the other player's range as given.
 *
 * - `edge` (-1 to 1): weight moves toward the strong hands (positive) or the weak ones.
 * - `polar` (-1 to 1): weight moves to both ends (positive) or to the middle.
 * - `nuts` (0 to 2): the weight of the hands with 90% equity or more, as a multiple.
 * - `cap` (0.5 to 1): hands with more equity than this are taken out. 1: no cap.
 * - `curve`: the equity curve dragged by hand. One offset per handle (`KNOBS`: where along the
 *   range each sits), in equity: +0.1 asks for the hand at that point of the range to have ten
 *   points more equity. Only weights change, and only downward: no hand is added.
 */
export const KNOBS = Object.freeze([0.1, 0.3, 0.5, 0.7, 0.9]);
export const NEUTRAL = Object.freeze({ edge: 0, polar: 0, nuts: 1, cap: 1, curve: Object.freeze([0, 0, 0, 0, 0]) });
/** A fresh set of dials at rest. */
export const neutral = () => ({ edge: 0, polar: 0, nuts: 1, cap: 1, curve: KNOBS.map(() => 0) });
export const NUTS = 0.9;

const straight = (w) => !w.curve || w.curve.every((x) => x === 0);
export const isNeutral = (w) => !w || (w.edge === 0 && w.polar === 0 && w.nuts === 1 && w.cap >= 1 && straight(w));

/**
 * The weights that give a range the equity curve asked for. The curve as it is (each point of
 * the range against the equity of the hand there) is moved by the offsets, kept rising, and read
 * back as how much of the range should sit at each equity; the hands at each equity are scaled to
 * hold that much. Hands only lose weight relative to one another: the result never has more of
 * a hand than the range was given.
 */
/** How far, in equity, a point of the wanted curve reaches for hands. */
const SPREAD = 0.04;

export function bend(weights, equity, offsets) {
  const ids = [];
  let total = 0;
  for (let i = 0; i < weights.length; i++) if (weights[i] > 0 && !Number.isNaN(equity[i])) { ids.push(i); total += weights[i]; }
  if (!ids.length) return Float64Array.from(weights);
  ids.sort((a, b) => equity[a] - equity[b]);
  // The equities the range holds, weakest first, with how much of the range is at each
  const levels = [];
  for (const i of ids) {
    const last = levels[levels.length - 1];
    if (last && Math.abs(last.e - equity[i]) < 1e-9) { last.mass += weights[i] / total; last.ids.push(i); } else levels.push({ e: equity[i], mass: weights[i] / total, ids: [i], wanted: 0 });
  }
  // The curve wanted, sampled along the range
  const S = 800;
  const offset = (x) => {
    if (x <= KNOBS[0]) return offsets[0];
    for (let k = 1; k < KNOBS.length; k++) if (x <= KNOBS[k]) return offsets[k - 1] + ((offsets[k] - offsets[k - 1]) * (x - KNOBS[k - 1])) / (KNOBS[k] - KNOBS[k - 1]);
    return offsets[KNOBS.length - 1];
  };
  let at = 0; let below = 0; let highest = 0;
  for (let s = 0; s < S; s++) {
    const x = (s + 0.5) / S;
    while (at < levels.length - 1 && below + levels[at].mass < x) below += levels[at++].mass;
    highest = Math.max(highest, Math.min(1, Math.max(0, levels[at].e + offset(x))));
    // Share this point's weight among the hands near the equity wanted, in proportion to how much
    // of each the range holds: the nearest hands take most, and no single hand is asked to stand
    // for a whole stretch of the curve
    let sum = 0;
    for (const level of levels) { const z = (level.e - highest) / SPREAD; level.pull = z > -4 && z < 4 ? level.mass * Math.exp(-0.5 * z * z) : 0; sum += level.pull; }
    if (sum > 0) for (const level of levels) level.wanted += level.pull / sum / S;
    else {
      let best = 0;
      for (let k = 1; k < levels.length; k++) if (Math.abs(levels[k].e - highest) < Math.abs(levels[best].e - highest)) best = k;
      levels[best].wanted += 1 / S;
    }
  }
  const out = Float64Array.from(weights);
  let most = 0;
  for (const level of levels) { const m = level.wanted / level.mass; if (m > most) most = m; for (const i of level.ids) out[i] *= m; }
  if (most > 0) for (const i of ids) out[i] /= most;
  return out;
}

/**
 * @param {Float64Array} weights One per combination.
 * @param {Float64Array} equity Each combination's equity against the other range (NaN where it has none).
 * @param {{ edge: number, polar: number, nuts: number, cap: number }} dials
 * @returns {Float64Array} The reshaped weights, the largest no more than 1.
 */
export function reshape(weights, equity, dials) {
  if (isNeutral(dials)) return Float64Array.from(weights);
  // the hand-drawn curve first, then the dials on what it leaves
  const out = straight(dials) ? Float64Array.from(weights) : bend(weights, equity, dials.curve);
  // where each hand stands in its own range, 0 the weakest and 1 the strongest
  const ids = [];
  let total = 0;
  for (let i = 0; i < out.length; i++) if (out[i] > 0 && !Number.isNaN(equity[i])) { ids.push(i); total += out[i]; }
  ids.sort((a, b) => equity[a] - equity[b]);
  if (dials.edge === 0 && dials.polar === 0 && dials.nuts === 1 && dials.cap >= 1) return out;
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
  // never more of a hand than the range was given
  let over = 0;
  for (const i of ids) over = Math.max(over, out[i] / weights[i]);
  if (over > 1) for (const i of ids) out[i] /= over;
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
