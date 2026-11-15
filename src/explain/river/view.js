// One hand's explanation as it is being written: the hand, the decision's actions, and the sentences said so far.
import { whatOf } from './hand-words.js';
import { AGGRESSIVE } from './terms.js';

const betShare = (bets, hand) => bets.reduce((t, a) => t + hand.strategy[a], 0);
/** The bet the hand makes most often, or -1 when there is no bet to make. */
const mainBetOf = (bets, hand) => (bets.length ? bets.reduce((best, a) => (hand.strategy[a] > hand.strategy[best] ? a : best), bets[0]) : -1);

export function handView(s, row, name) {
  const { decision, facing } = s;
  const { actions } = decision;
  const { hand } = row;
  const bets = actions.map((x, a) => (AGGRESSIVE.has(x.kind) ? a : -1)).filter((a) => a >= 0);
  return {
    s, decision, facing, actions, row, hand, bets,
    level: s.levels.get(hand.strength),
    fold: actions.findIndex((x) => x.kind === 'fold'),
    check: actions.findIndex((x) => x.kind === 'check'),
    betting: betShare(bets, hand),
    mainBet: mainBetOf(bets, hand),
    what: whatOf(decision, hand, name),
    verb: facing ? 'continue' : 'bet',
    line: '',
    reasons: [],
  };
}

/** A paragraph of the explanation, kept when there is something to say. */
export const say = (view, id, text) => { if (text) view.reasons.push({ id, text: text.replace(/\s+/g, ' ').trim() }); };
export const label = (view, a) => view.actions[a].label;
/** How often a row takes the move the decision is about: continuing against a bet, betting when first to act. */
export const move = (view, r) => (view.facing ? 1 - r.hand.strategy[view.fold] : betShare(view.bets, r.hand));
/** How often the hand checks, when it can. */
export const checksOf = (view) => (view.check >= 0 ? view.hand.strategy[view.check] : 0);
