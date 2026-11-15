// What the choice costs, from the solver's values: whether more than one action is fine, and what the next best loses.
import { MISTAKE } from './terms.js';
import { label, say } from './view.js';

/** @returns {'forced'|'optional'|'unknown'} */
export function sayCost(view) {
  const { row, actions } = view;
  if (!row.gaps) return 'unknown';
  const status = actions.filter((_, a) => row.fine[a]).length > 1 ? 'optional' : 'forced';
  const worst = row.gaps.map((g, a) => ({ g, a })).filter((x) => x.g > MISTAKE).sort((x, y) => x.g - y.g)[0];
  if (status === 'forced' && worst) {
    say(view, 'cost', `It is not close: the next best play, ${label(view, worst.a)}, loses ${(100 * worst.g).toFixed(1)}% of the pot with this hand.`);
  }
  return status;
}
