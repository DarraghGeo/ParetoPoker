// What the hand's own cards change: the folds they win or cost a bet, and what they take out of his range next to
// other hands'.
import { meanOf } from '../rows.js';
import { pct } from './terms.js';

/** What he folds to your average hand after action `a`. */
function usualFolds(rows, a) {
  let w = 0, f = 0;
  for (const r of rows) if (r.folds[a] != null) { w += r.hand.weight; f += r.hand.weight * r.folds[a]; }
  return w > 0 ? f / w : null;
}

/** Whether the hand's cards make him fold more or less to action `a` than to your average hand. */
export function cardsHelp(view, a) {
  const mine = view.row.folds[a]; const avg = usualFolds(view.s.rows, a);
  if (mine == null || avg == null || !view.hand.cards) return '';
  const against = `so he folds ${pct(mine)} to you against ${pct(avg)} to your average hand.`;
  if (mine - avg > 0.015) return `Your cards help: they take some of his calling hands out of his range, ${against}`;
  if (avg - mine > 0.015) return `Your cards are no help here: they take away hands he would have folded, ${against}`;
  return '';
}

/** What other hands' cards take out of his range on average: of the hands that beat them, and of the hands they beat. */
export const peerCards = (peers) => ({ meanBetter: meanOf(peers, (r) => r.removesBetter), meanWorse: meanOf(peers, (r) => r.removesWorse) });
