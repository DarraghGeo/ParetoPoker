// Where the line falls: what the hands a little stronger and a little weaker do.
import { move, say } from './view.js';
import { pct } from './terms.js';

/** How often the hands whose equity is between `from` and `to` above this one's take the move. */
function near(view, from, to) {
  let w = 0, m = 0;
  for (const r of view.s.rows) {
    const d = r.equity - view.row.equity;
    if (d > from && d <= to) { w += r.hand.weight; m += r.hand.weight * move(view, r); }
  }
  return w > 0 ? m / w : null;
}

/** Said when the hand mixes and hands a touch either side of it play differently enough (`wide` judges the gap). */
export function sayAtTheLine(view, wide) {
  const above = near(view, 0.015, 0.1);
  const below = near(view, -0.1, -0.015);
  const moves = move(view, view.row);
  if (above == null || below == null || !wide(above - below) || !(moves > 0.02 && moves < 0.98)) return;
  say(view, 'line', `You are right at the line: hands a touch stronger ${view.verb} ${pct(above)} of the time, a touch weaker ${pct(below)}.`);
}
