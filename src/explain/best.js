/**
 * What an action is really worth to a hand: take it now, then play every later decision as well
 * as that hand can against the other player's solved strategy.
 *
 * The solver's own value walk (`actionValues` in account.js) has the hand follow its solved
 * strategy afterwards. For an action the hand takes, that is the same thing. For one it never
 * takes, its later strategy was never trained (the hand does not get there) and the number means
 * nothing. Here the later play is the best reply instead, so the cost of a deviation is the cost
 * of the deviation and not of playing badly after it.
 *
 * `mode`: 'best' (best reply afterwards), 'average' (the solved strategy afterwards: the same
 * numbers as `actionValues`, kept as a check on this walk).
 *
 * The walk is its own (best/walk.js): it reads the strategies, the tree and the cards, and nothing
 * of the solver's value code. Values are chips from splitting the pot the spot started with.
 *
 * Returns `values(frame, mode)`, with `values.closely(frame, a, groupOf)` (best/closely.js) and
 * `values.gameValue(me, start)` (best/values.js).
 */
import { closely } from './best/closely.js';
import { gameValue, valuesAt } from './best/values.js';
import { walkerOf } from './best/walker.js';

export function evaluator(fs, solution, nodes) {
  const g = walkerOf(fs, solution, nodes);
  const valuesOf = (f, mode = 'best') => valuesAt(g, f, mode);
  return Object.assign(valuesOf, { closely: (f, a, groupOf) => closely(g, f, a, groupOf), gameValue: (me, start) => gameValue(g, me, start) });
}
