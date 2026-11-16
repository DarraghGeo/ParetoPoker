// Facing a bet, one move ahead: why the hand folds, or why it calls, against the hands he bets.
import { sayGroups } from '../groups.js';
import { percent } from '../words.js';
import { against } from './replies.js';
import { later } from './ahead.js';

const betting = (y) => (y.his?.length ? ` He is betting ${sayGroups(y.his)}.` : '');
const callDetail = (y, nx) => `A call needs ${percent(y.price)} and the hand has ${percent(y.equity)} against the range that bet.${nx ? nx.detail : ''}`;

function foldText(k, call, nx) {
  const his = betting(call);
  if (call.equity < call.price) return `It does not have the price to call: it is ${against(call.equity)} the hands that bet.${his}`;
  if (k.river) return `It has the price on paper, and folds all the same: the cards it holds make his bets stronger than they look.${his}`;
  if (nx && nx.nx.can <= 0.6) return `It has the price for this bet, but not for the next: ${nx.quit}.${his}`;
  if (k.m.actions[k.top].sigma < 0.85) {
    return `It is close. It has the price on paper and the solution calls with it part of the time; equity that has to face another bet is worth a little ` +
      `less than its number.${his}`;
  }
  return `It has the raw equity to call, but equity that has to face another bet is worth less than its number.${his}`;
}

/** A fold: set against the call it passes up. Null when the call has no equity to show. */
export function foldMove(k) {
  const ci = k.mv.actions.findIndex((y) => y.kind === 'call'); const call = k.mv.actions[ci];
  if (!(call && call.equity != null)) return null;
  const nx = call.equity >= call.price ? later(k, ci) : null;
  return { id: 'move', text: foldText(k, call, nx), detail: callDetail(call, nx) };
}

function callFirst(x, river) {
  if (x.equity >= 0.5) return `It calls: it is ${against(x.equity)} the hands that bet.`;
  if (x.equity >= x.price) return `It has the price to call: it is ${against(x.equity)} the hands that bet, and the price asks for less.`;
  if (river) return 'Against the hands that bet it is just short of the price, so the call is close: the cards it holds, and what they take out of his range, decide it.';
  return 'On equity alone it is short of the price, and calls for what the cards to come can still bring.';
}

/** The largest bet the hand could call against these same hands, in words. */
function sizeWord(e) {
  const upTo = e < 0.5 && e > 0.05 ? e / (1 - 2 * e) : null;
  if (upTo == null) return '';
  if (upTo >= 2) return ' It could call a bet of any size he has here.';
  const size = upTo >= 0.9 ? 'a pot-sized bet' : upTo >= 0.6 ? 'three quarters of the pot' : upTo >= 0.4 ? 'half the pot' : 'a third of the pot';
  return ` Against these same hands it could call up to about ${size}.`;
}

/** A call: its equity against the hands that bet, and the street after. */
export function callMove(k) {
  const { x } = k; const nx = later(k, k.top);
  const text = `${callFirst(x, k.river)}${betting(x)}${nx ? ` ${nx.text}` : ''}${nx ? '' : sizeWord(x.equity)}`;
  return { id: 'move', text, detail: `${callDetail(x, nx)}${k.versus}` };
}
