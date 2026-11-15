// A decision as Train's questions need it: each range's hands with their equity, and what the two ranges add up to.
import { heroHands, surveyOf, villainHands } from '../hands.js';

/** A nut hand has this much equity against the other range, as in Study's editor. */
export const NUTS = 0.9;

/** A range's total combinations, its mean equity and the share of it that is nut hands. */
function summed(list) {
  let combos = 0, equity = 0, nuts = 0;
  for (const h of list) { combos += h.w; equity += h.w * h.e; if (h.e >= NUTS) nuts += h.w; }
  return { combos, equity: equity / combos, nuts: nuts / combos };
}

export function spotOf(decision) {
  const s = surveyOf(decision); const hero = heroHands(s); const villain = villainHands(decision, s);
  return { decision, s, hero, villain, mine: summed(hero), his: summed(villain), asked: {}, seen: new Set() };
}
