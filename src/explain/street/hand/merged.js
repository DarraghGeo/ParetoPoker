// A merged bet: one bet that is a value bet and a bluff at once. Set against the quiet action (checking, or calling),
// his answers split what the bet gains (measure.js, `gains`): his calls pay it, which is the value, and his folds earn it
// something too, which is the bluff (the hands that fold would have taken the pot some of the time, at showdown or by
// betting). A bet is merged when both parts are real and neither is most of the two.

/** Each part is at least this much of the pot (in %), and at least this share of the two together. */
const REAL = 0.5; const SHARE = 0.25;

/**
 * Whether action `i` is a merged bet for the hand; null when it is not, or cannot be told.
 * @returns {{ calls: number, folds: number, raises: number, quiet: number } | null} What the bet gains over the quiet
 *   action from his calls, from his folds and from his raises, in % of the pot, and which action the quiet one is.
 */
export function mergedBet(h, i) {
  const g = h.m.actions[i]?.gains; if (!g) return null;
  const both = g.calls + g.folds;
  return g.calls >= REAL && g.folds >= REAL && Math.min(g.calls, g.folds) >= SHARE * both ? g : null;
}
