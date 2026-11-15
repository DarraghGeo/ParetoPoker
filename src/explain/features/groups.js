import { STRAIGHT } from './cards.js';
import { DRAW_OUTS } from './made.js';

/** Top pair or an overpair. */
export const isTopPair = (feature) => feature.pair === 'top pair' || feature.pair === 'overpair';

/**
 * His hands in a handful of groups, for saying what a bet gains against and loses to. One group
 * a hand, by the first that fits:
 *   'strong'       two pair or better made with its own cards (on a paired board: trips or better)
 *   'top pair'     top pair or an overpair
 *   'lower pair'   any other pair of its own
 *   'flush draw'   no pair, eight or more outs to a flush
 *   'straight draw' no pair, eight or more outs to a straight
 *   'nothing'      no pair and no such draw (gutshots and overcards included)
 */
export function groupOf(feature) {
  if (feature.own >= 2 || feature.made >= STRAIGHT) return 'strong';
  if (feature.own === 1) return isTopPair(feature) ? 'top pair' : 'lower pair';
  if (feature.flushOuts >= DRAW_OUTS) return 'flush draw';
  if (feature.straightOuts >= DRAW_OUTS) return 'straight draw';
  return 'nothing';
}
export const GROUPS = ['strong', 'top pair', 'lower pair', 'flush draw', 'straight draw', 'nothing'];

