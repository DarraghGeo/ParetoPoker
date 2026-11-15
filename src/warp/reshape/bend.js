import { byEquity, divideAll } from './by-equity.js';
import { KNOBS } from './dials.js';

/** How far, in equity, a point of the wanted curve reaches for hands. */
const SPREAD = 0.04;
/** Points along the range at which the wanted curve is read. */
const SAMPLES = 800;

/**
 * The weights that give a range the equity curve asked for. The curve as it is (each point of
 * the range against the equity of the hand there) is moved by the offsets, kept rising, and read
 * back as how much of the range should sit at each equity; the hands at each equity are scaled to
 * hold that much. Hands only lose weight relative to one another: the result never has more of
 * a hand than the range was given.
 */
export function bend(weights, equity, offsets) {
  const { ids, total } = byEquity(weights, equity);
  if (!ids.length) return Float64Array.from(weights);
  const levels = equityLevels(weights, equity, ids, total);
  sampleWantedCurve(levels, offsets);
  return scaledToWanted(weights, levels, ids);
}

/** The equities the range holds, weakest first, with how much of the range is at each. */
function equityLevels(weights, equity, ids, total) {
  const levels = [];
  for (const i of ids) {
    const last = levels[levels.length - 1];
    if (last && Math.abs(last.e - equity[i]) < 1e-9) { last.mass += weights[i] / total; last.ids.push(i); }
    else levels.push({ e: equity[i], mass: weights[i] / total, ids: [i], wanted: 0, pull: 0 });
  }
  return levels;
}

/** The handles' offset at a point of the range, straight between handles and flat beyond the outer ones. */
function offsetAt(offsets, x) {
  if (x <= KNOBS[0]) return offsets[0];
  for (let k = 1; k < KNOBS.length; k++) if (x <= KNOBS[k]) return between(offsets, k, x);
  return offsets[KNOBS.length - 1];
}

const between = (offsets, k, x) => offsets[k - 1] + ((offsets[k] - offsets[k - 1]) * (x - KNOBS[k - 1])) / (KNOBS[k] - KNOBS[k - 1]);

/** Walks the range, each point asking for the equity there plus its offset, never lower than the point before. */
function sampleWantedCurve(levels, offsets) {
  let at = 0; let below = 0; let highest = 0;
  for (let s = 0; s < SAMPLES; s++) {
    const x = (s + 0.5) / SAMPLES;
    while (at < levels.length - 1 && below + levels[at].mass < x) below += levels[at++].mass;
    highest = Math.max(highest, Math.min(1, Math.max(0, levels[at].e + offsetAt(offsets, x))));
    shareSample(levels, highest);
  }
}

/**
 * Shares one point's weight among the hands near the equity wanted, in proportion to how much of each the range
 * holds: the nearest hands take most, and no single hand is asked to stand for a whole stretch of the curve.
 */
function shareSample(levels, wanted) {
  let sum = 0;
  for (const level of levels) {
    const z = (level.e - wanted) / SPREAD;
    level.pull = z > -4 && z < 4 ? level.mass * Math.exp(-0.5 * z * z) : 0;
    sum += level.pull;
  }
  if (sum > 0) for (const level of levels) level.wanted += level.pull / sum / SAMPLES;
  else levels[nearestLevel(levels, wanted)].wanted += 1 / SAMPLES;
}

function nearestLevel(levels, wanted) {
  let best = 0;
  for (let k = 1; k < levels.length; k++) if (Math.abs(levels[k].e - wanted) < Math.abs(levels[best].e - wanted)) best = k;
  return best;
}

function scaledToWanted(weights, levels, ids) {
  const out = Float64Array.from(weights);
  let most = 0;
  for (const level of levels) {
    const m = level.wanted / level.mass;
    if (m > most) most = m;
    for (const i of level.ids) out[i] *= m;
  }
  if (most > 0) divideAll(out, ids, most);
  return out;
}
