// One move ahead, for the hand's main action: the action set against it, what the two are worth, the folds a bet needs,
// and the street after a call.
import { nextStreet } from '../next-street.js';
import { percent, ofPot, often } from '../words.js';

const sortOf = (y) => (['check', 'call', 'fold'].includes(y.kind) ? y.kind : 'wager');
const worthWords = (v) => (v < 0 ? `${ofPot(v)} of the pot less than nothing` : `${ofPot(v)} of the pot`);

/** What the two are worth: the solution's own figures where it has them (an action it hardly takes is not trained), else the count. */
function versusText({ label, mv, top, x }, other, exact) {
  if (other == null) return '';
  if (exact == null) return ` Counted one move ahead, ${label(top)} is worth ${worthWords(x.value)} and ${label(other)} ${worthWords(mv.actions[other].value)}.`;
  if (Math.abs(exact) < 0.5) return ` In the solution ${label(top)} and ${label(other)} are worth the same with this hand.`;
  return ` In the solution ${label(top)} is worth ${ofPot(exact)} of the pot ${exact > 0 ? 'more' : 'less'} than ${label(other)} with this hand.`;
}

/** The hand's main action counted one move ahead (`x`), the best action of another sort (`other`), and what separates them. */
export function aheadOf(h, mv, top) {
  const { m } = h; const x = mv.actions[top];
  const other = mv.actions.map((y, i) => i).filter((i) => i !== top && sortOf(mv.actions[i]) !== sortOf(x) && mv.actions[i].kind !== 'fold')
    .sort((i, j) => mv.actions[j].value - mv.actions[i].value)[0];
  const exact = other != null && m.actions[top].worth != null && m.actions[other].worth != null ? m.actions[top].worth - m.actions[other].worth : null;
  const k = { ...h, mv, top, x, other, exact };
  return { ...k, versus: versusText(k, other, exact) };
}

/** How often he would have to fold to wager `w` for it to be worth what the quiet action `q` is: from the solution's figures, else the count. */
export function foldsNeeded({ m, mv }, w, q) {
  const W = m.actions[w]; const Q = m.actions[q];
  if (W.worth != null && Q.worth != null && W.folds != null && W.folds > 0.02 && W.folds < 0.98) {
    const whenFolds = W.fromFolds / W.folds; const cont = (W.worth - W.fromFolds) / (1 - W.folds);
    return whenFolds > cont ? { need: (Q.worth - cont) / (whenFolds - cont), folds: W.folds } : null;
  }
  const wm = mv.actions[w]; const wf = wm.parts.filter((p) => p.kind === 'fold').reduce((t, p) => t + p.share, 0);
  if (wf >= 0.999 || !wm.parts.length) return null;
  const cont = (wm.chips - wf * mv.pot) / (1 - wf);
  return mv.pot > cont ? { need: (mv.actions[q].chips - cont) / (mv.pot - cont), folds: wf } : null;
}

/** The street after a call: how often he bets again, and on which cards this hand can go on. Null when he hardly does. */
export function later({ s, m, river }, a) {
  const nx = river ? null : nextStreet(s, m.combo, a); if (!nx || nx.bets < 0.1) return null;
  const bets = often(nx.bets, 'bets');
  return { text: `He ${bets} the ${nx.street} again, and this hand can call ${nx.named}.`,
    quit: `he ${bets} the ${nx.street} again, and this hand could keep calling only ${nx.named}`,
    detail: ` On the ${nx.street} he bets ${percent(nx.bets)} of the time on average; this hand has the price to call ${percent(nx.can)} of those bets.`, nx };
}
