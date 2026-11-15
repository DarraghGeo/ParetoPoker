// A decision's two ranges as the charts draw them: the range to act and the other range, each hand with its weight and its
// equity against the other, weakest first.
import { survey } from '../../src/explain/river.js';
import { outline } from '../../src/explain/outline.js';

const shares = (a, b) => a.cards && b.cards && a.cards.some((c) => b.cards.includes(c));
const byName = (a, b) => (a.name < b.name ? -1 : 1);

/** A decision read for its hands: on the river by showdown strength, before it by equity. */
export const surveyOf = (decision) => (decision.street === 'river' ? survey(decision) : outline(decision));

/** One of his hands, and its equity against the range to act: given before the river, from showdown strength on it. */
export function hisEquity(v, rows) {
  if (v.equity !== undefined) return Number.isNaN(v.equity) ? 0 : v.equity;
  let mass = 0, win = 0;
  for (const { hand } of rows) {
    if (shares(v, hand)) continue;
    mass += hand.weight; win += hand.weight * (v.strength > hand.strength ? 1 : v.strength < hand.strength ? 0 : 0.5);
  }
  return mass > 0 ? win / mass : 0;
}

/** The hands of the range to act, weakest first (equity, then strength, then name), each with its row of the survey. */
export const heroHands = (s) => s.rows.map((row) => ({ w: row.hand.weight, e: row.equity, name: row.hand.name, strength: row.hand.strength ?? 0, row }))
  .sort((a, b) => a.e - b.e || a.strength - b.strength || byName(a, b));

/** The other range's hands, weakest first. */
export const villainHands = (decision, s) => decision.villain.map((v) => ({ w: v.weight, e: hisEquity(v, s.rows), name: v.name })).sort((a, b) => a.e - b.e);
