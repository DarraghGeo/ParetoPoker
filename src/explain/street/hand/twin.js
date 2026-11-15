// The hand beside its likes, before the river: its twin with or without its flush draw (or, on the flop, its backdoor
// flush draw), where nothing else differs, so what they do differently is down to the draw; and what it is worth against
// the hands of the same equity. Numbers of this solution.
import { twins, worthAround } from '../twins.js';
import { pretty } from '../hand-words.js';
import { percent, ofPot, often } from '../words.js';

const FACING_GROUPS = [['fold', (k) => k === 'fold', 'folds'], ['call', (k) => k === 'call', 'calls'],
  ['raise', (k) => !['fold', 'call'].includes(k), 'raises']];
const ACTING_GROUPS = [['check', (k) => k === 'check', 'checks'], ['bet', (k) => k !== 'check', 'bets']];

/** Where the hand's play and its twin's differ most: the verb for it, the two frequencies, and how far apart they are. */
function widestGap(m, mix, facing) {
  const groups = facing ? FACING_GROUPS : ACTING_GROUPS;
  const share = (v) => groups.map(([, is]) => m.actions.reduce((t, x, i) => t + (is(x.kind) ? v[i] : 0), 0));
  const mine = share(m.actions.map((x) => x.sigma)); const theirs = share(mix);
  const g = mine.reduce((b, x, i) => (Math.abs(x - theirs[i]) > Math.abs(mine[b] - theirs[b]) ? i : b), 0);
  return { verb: groups[g][2], mine: mine[g], theirs: theirs[g], gap: Math.abs(mine[g] - theirs[g]) };
}

function twinNumbers(m, tw, d, dWorth) {
  const dEq = m.equity - tw.eq; const more = (x) => (x >= 0 ? 'more' : 'less');
  const value = dWorth != null ? ` This hand has ${percent(Math.abs(dEq))} ${more(dEq)} equity and is worth ${ofPot(dWorth)} of the pot ${more(dWorth)}.` : '';
  return `In this solution the twin ${d.verb} ${percent(d.theirs)} of the time and this hand ${percent(d.mine)}.${value}`;
}

function twinText(tw, d, other) {
  const plays = `${often(d.theirs, d.verb)} here, and this one ${often(d.mine, d.verb)}. Nothing else differs between them.`;
  if (tw.have) return `The ${tw.draw} is the reason. The same hand without it (${other}) ${plays}`;
  return `It lacks a ${tw.draw}. The same hand with one (${other}) ${plays}`;
}

export function twinReason({ s, m, facing }) {
  const tw = twins(s, m.combo); if (!tw) return null;
  const d = widestGap(m, tw.mix, facing); const other = `${tw.several ? 'such as ' : ''}${pretty(tw.name)}`;
  const dWorth = tw.worth != null && tw.mineWorth != null ? tw.mineWorth - tw.worth : null; const numbers = twinNumbers(m, tw, d, dWorth);
  if (d.gap >= 0.15) return { id: 'twin', detail: numbers, text: twinText(tw, d, other) };
  if (!(tw.have && dWorth != null && dWorth >= 2)) return null;
  const worthMore = `The ${tw.draw} does not change how it plays here, but it makes the hand worth more than the same hand without it (${other}).`;
  return { id: 'twin', detail: numbers, text: worthMore };
}

const SHOWDOWN_EQUITY = 'Its equity is showdown equity: it wins the small pots that get checked down and has little to improve to.';
const FEW_OUTS = 'A pocket pair that is not an overpair has only two cards that improve it.';
const DRAW_PAYS = 'A draw wins a bigger pot when it comes in than a made hand of the same equity wins.';

function worthText(less, x) {
  const drawn = x.draw != null;
  if (less && !drawn && x.own === 0) return `${SHOWDOWN_EQUITY} So it is worth less than its equity suggests.`;
  if (less && x.pocket && (x.pair === 'underpair' || x.pair === 'middle pair')) return `${FEW_OUTS} So it is worth less than its equity suggests.`;
  if (!less && drawn) return `${DRAW_PAYS} So it is worth more than its equity suggests.`;
  return `It is worth ${less ? 'less' : 'more'} than your other hands of about the same equity.`;
}

/** What the hand is worth against your other hands of the same equity: equity that can improve wins more than equity that cannot. */
export function worthReason({ s, m }) {
  const w = worthAround(s, m.combo); if (!(w && Math.abs(w.mine - w.others) >= 3)) return null;
  const less = w.mine < w.others; const by = `${ofPot(w.mine - w.others)} of the pot ${less ? 'less' : 'more'}`;
  const detail = `In this solution it is worth ${by} than your other hands within five points of its equity.`;
  return { id: 'worth', text: worthText(less, m.features), detail };
}
