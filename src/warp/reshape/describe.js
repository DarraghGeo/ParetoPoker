import { NUTS } from './dials.js';

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
