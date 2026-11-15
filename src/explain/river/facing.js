// Facing a bet: the price of a call, and whether the hand clears it, misses it, or is a bluff-catcher right at it.
import { weightedMean } from '../rows.js';
import { cardsHelp, peerCards } from './cards.js';
import { mostly, strongerThanYou, weakerThanYou, withList } from './his-range.js';
import { pct } from './terms.js';
import { sayAtTheLine } from './the-line.js';
import { label, move, say } from './view.js';

/** Within this much of the price, calling and folding are worth the same. */
export const atPrice = (s, row) => Math.abs(row.equity - s.need) <= 0.02;

const capital = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const priceOf = ({ s, decision: { pot, toCall } }) =>
  `He bet ${Math.round(toCall)} into ${Math.round(pot - toCall)}, so a call has to win ${pct(s.need)} of the time.`;
const hisBluffs = (view) => mostly(view, (his) => (weakerThanYou(view, his) ? 1 : 0));
const hisValue = (view) => mostly(view, (his) => (strongerThanYou(view, his) ? 1 : 0));

function raiseForValue(view, called) {
  const { mainBet, what } = view;
  view.line = `You raise for value with ${what}. `
    + `Even against the hands that continue against ${label(view, mainBet)} you are ahead ${pct(called)} of the time.`;
  const n = view.row.next[mainBet];
  if (!n) return;
  const again = n.more > 0.005 ? `, and raises again ${pct(n.more)}` : '';
  say(view, 'raise', `He folds ${pct(n.fold)} to the raise, calls with worse ${pct(n.callWorse)} and calls with better ${pct(n.callBetter)}${again}. `
    + 'Just calling would win the pot as it stands; the raise gets paid by the worse hands that will not fold.');
}

function raiseAsBluff(view) {
  const { row, mainBet } = view;
  view.line = `You raise as a bluff with ${view.what}. Calling would win only ${pct(row.equity)} of the time, `
    + `and he folds ${pct(row.folds[mainBet] ?? 0)} to ${label(view, mainBet)} where the raise needs ${pct(view.s.sizes[mainBet].needsFolds)}.`;
  say(view, 'raise', cardsHelp(view, mainBet));
}

/** Which bluff-catchers call: the cards they hold, this one's against the others'. */
function callersCards(view) {
  const { s, row, hand } = view;
  const peers = s.rows.filter((r) => r !== row && atPrice(s, r));
  if (!peers.length || !hand.cards) return '';
  const { meanBetter, meanWorse } = peerCards(peers);
  const mine = move(view, row); const theirs = weightedMean(peers, (r) => move(view, r));
  const good = (row.removesBetter - meanBetter) - (row.removesWorse - meanWorse);
  if (!(Math.abs(good) >= 0.02)) return '';
  return ` Yours ${good > 0 ? 'are good ones to call with' : 'are poor ones to call with'}: `
    + `they take out ${pct(row.removesBetter)} of his value and ${pct(row.removesWorse)} of his bluffs, `
    + `where your other bluff-catchers take out ${pct(meanBetter)} and ${pct(meanWorse)}. `
    + `That is why this one continues ${pct(mine)} of the time and they continue ${pct(theirs)}.`;
}

function bluffCatcher(view) {
  const { s, row } = view;
  if (!view.line) {
    view.line = `${capital(view.what)} is a pure bluff-catcher here. ${priceOf(view)} `
      + `You beat ${pct(row.equity)} of the hands he bets, which is that price almost exactly.`;
  }
  say(view, 'price', `You beat his bluffs${withList(hisBluffs(view), ': ')} and lose to everything he bets for value${withList(hisValue(view), ': ')}. `
    + 'So calling and folding make the same money with this hand: what it does is not about the hand, '
    + 'it is about how many of your bluff-catchers have to call.');
  say(view, 'defence', 'If you folded all of them his bluffs would always win, '
    + `so your range has to continue ${pct(1 - s.mix[view.fold])} of the time against this bet. `
    + `The hands that beat some of his value call first; the bluff-catchers fill the rest.${callersCards(view)}`);
}

function callClear(view, edge, raising, called) {
  const { row, mainBet } = view;
  if (!view.line) {
    view.line = `You call with ${view.what}. ${priceOf(view)} `
      + `You beat ${pct(row.equity)} of the hands he bets${withList(hisBluffs(view))}: ${Math.round(100 * edge)} points clear.`;
  }
  if (raising || called == null || !(row.equity > 0.7) || mainBet < 0) return;
  say(view, 'no-raise', `You do not raise. Against ${label(view, mainBet)} he would fold what you beat `
    + `and continue with hands that beat you ${pct(1 - called)} of the time: `
    + 'the raise wins nothing more from the worse hands and loses more to the better ones.');
}

function foldShort(view, edge) {
  const short = Math.round(-100 * edge);
  if (!view.line) {
    view.line = `You fold ${view.what}. ${priceOf(view)} `
      + `You beat only ${pct(view.row.equity)} of the hands he bets, ${short} points short of the price.`;
  }
  const bluffs = hisBluffs(view);
  if (!bluffs) return;
  say(view, 'price', `All you beat is ${bluffs.replace(/ \(\d+%\)/g, '')} in his betting range, `
    + `and there are not enough of them: you are ${short} points short.`);
}

export function facingBet(view) {
  const { s, row, mainBet } = view;
  const edge = row.equity - s.need;
  const raising = mainBet >= 0 && view.betting > 0.1;
  const called = mainBet >= 0 ? row.whenCalled[mainBet] : null;
  if (raising && called != null && called >= 0.5) raiseForValue(view, called);
  else if (raising) raiseAsBluff(view);
  if (atPrice(s, row)) bluffCatcher(view);
  else if (edge > 0) callClear(view, edge, raising, called);
  else foldShort(view, edge);
  sayAtTheLine(view, (gap) => gap >= 0.4);
}
