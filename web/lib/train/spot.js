// A decision as Train's questions need it: each range's hands with their equity, and what the two ranges add up to.
import { survey } from '../../../src/explain/river.js';
import { outline } from '../../../src/explain/outline.js';

/** A nut hand has this much equity against the other range, as in Study's editor. */
export const NUTS = 0.9;
const shares = (a, b) => a.cards.some((c) => b.cards.includes(c));

/** One of his hands against the range to act, from showdown strength (river) where no equity is given. */
function hisEquity(v, rows) {
  if (v.equity !== undefined) return Number.isNaN(v.equity) ? 0 : v.equity;
  let mass = 0, win = 0;
  for (const { hand } of rows) {
    if (shares(v, hand)) continue;
    mass += hand.weight; win += hand.weight * (v.strength > hand.strength ? 1 : v.strength < hand.strength ? 0 : 0.5);
  }
  return mass > 0 ? win / mass : 0;
}

/** A range's total combinations, its mean equity and the share of it that is nut hands. */
function summed(list) {
  let combos = 0, equity = 0, nuts = 0;
  for (const h of list) { combos += h.w; equity += h.w * h.e; if (h.e >= NUTS) nuts += h.w; }
  return { combos, equity: equity / combos, nuts: nuts / combos };
}

export function spotOf(decision) {
  const s = decision.street === 'river' ? survey(decision) : outline(decision);
  const hero = s.rows.map((r) => ({ w: r.hand.weight, e: r.equity, name: r.hand.name })).sort((a, b) => a.e - b.e || (a.name < b.name ? -1 : 1));
  const villain = decision.villain.map((v) => ({ w: v.weight, e: hisEquity(v, s.rows), name: v.name })).sort((a, b) => a.e - b.e);
  return { decision, s, hero, villain, mine: summed(hero), his: summed(villain), asked: {}, seen: new Set() };
}
