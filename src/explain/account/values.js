import { facingOf } from '../../combos.js';
import { toStored } from './frame.js';

/** One number per hand of ours that faces any of his range; NaN for the rest. */
export function perHand(f, valueOf) {
  const out = new Float64Array(f.fs.COMBOS).fill(NaN);
  for (let c = 0; c < f.fs.COMBOS; c++) if (f.mine[c] > 0 && f.mass[c] > 0) out[c] = valueOf(c);
  return out;
}

/** Raw values of a node under this frame for a given reach of his (stored frame), read back by real combination, in chips. */
export function chips(f, child, hisS) {
  const raw = f.solver.valuesAt(child, f.at, f.me, f.mineS, hisS, f.live, f.live.length);
  return perHand(f, (c) => raw[f.stored[c]] / (f.mass[c] * f.scale));
}

/** What each action is worth to each hand: `values[a][combo]`, chips. */
export function actionValues(f) {
  return f.node.edges.map((edge) => chips(f, edge.child, f.hisS));
}

/** A part of his range against each hand: how much of what the hand faces it is (`share`), and what it adds to a node's value. */
export function partOf(f, child, reach) {
  const facing = facingOf(f.fs, reach);
  const share = perHand(f, (c) => facing(c) / f.mass[c]);
  return { share, value: chips(f, child, toStored(f.fs, f.stored, reach, (c) => reach[c] > 0)) };
}
