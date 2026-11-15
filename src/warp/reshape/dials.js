/**
 * The dials that reshape a real range, at rest and not.
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

/** No handle of the drawn curve has moved. */
export const isStraight = (w) => !w.curve || w.curve.every((x) => x === 0);
/** The four dials apart from the curve are at rest. */
export const dialsAtRest = (w) => w.edge === 0 && w.polar === 0 && w.nuts === 1 && w.cap >= 1;
export const isNeutral = (w) => !w || (dialsAtRest(w) && isStraight(w));
