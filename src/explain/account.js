/**
 * Accounting for one decision of a solved spot, on any street.
 *
 * Everything here is arithmetic on the solution, with no judgement in it: what each action is
 * worth to each hand, and that worth split three ways, each split adding back up to the whole:
 *
 *   by what he does next   (he folds / calls / raises; he checks / bets)
 *   by what he holds       (any grouping of his hands)
 *   by the card that comes (when the action ends the street)
 *
 * The splits are exact because a hand's value is a sum over his hands and over the cards to
 * come; `research/proof/identities.mjs` checks every one of them on every hand of a battery of
 * spots. Values are chips, measured from splitting the pot the spot started with: winning that
 * pot outright with nothing more put in is +pot/2.
 */

export { frameAt } from './account/frame.js';
export { actionValues } from './account/values.js';
export { byReply } from './account/reply.js';
export { byHolding } from './account/holding.js';
export { byCard } from './account/card.js';
