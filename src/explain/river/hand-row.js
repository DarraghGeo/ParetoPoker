// One hand against his whole range: what it beats, what its cards take out of his range, and what he does next after
// each of its actions.
import { MISTAKE, shares } from './terms.js';

const noAnswers = () => ({ fold: 0, check: 0, callWorse: 0, callBetter: 0, more: 0, mass: 0, win: 0, cont: 0, showdown: 0, showdownWin: 0 });
const share = (part, all) => (all > 0 ? part / all : 0);

/** His answer to one action, added in for one of his hands (`result`: what the hand wins against it at showdown). */
function addAnswer(next, answer, weight, result) {
  next.mass += weight;
  next.fold += weight * answer.fold;
  next.check += weight * answer.check;
  next.more += weight * answer.more;
  next.callWorse += weight * answer.call * result;
  next.callBetter += weight * answer.call * (1 - result);
  next.cont += weight * (1 - answer.fold);
  next.win += weight * (1 - answer.fold) * result;
  next.showdown += weight * (answer.check + answer.call);
  next.showdownWin += weight * (answer.check + answer.call) * result;
}

/** One of his hands, added in: counted as removed when the hand's cards block it, otherwise faced. */
function addHis(tally, hand, his) {
  const stronger = his.strength > hand.strength;
  const weaker = his.strength < hand.strength;
  if (stronger) tally.allBetter += his.weight; else if (weaker) tally.allWorse += his.weight;
  if (hand.cards && shares(hand.cards, his.cards)) {
    if (stronger) tally.blockedBetter += his.weight; else if (weaker) tally.blockedWorse += his.weight;
    return;
  }
  tally.mass += his.weight;
  const result = weaker ? 1 : stronger ? 0 : 0.5;
  tally.win += his.weight * result;
  if (weaker) tally.worse += his.weight;
  his.answers.forEach((answer, a) => { if (answer) addAnswer(tally.next[a], answer, his.weight, result); });
}

function tallyAgainst(hand, villain, actions) {
  const tally = { mass: 0, win: 0, worse: 0, blockedBetter: 0, blockedWorse: 0, allBetter: 0, allWorse: 0 };
  tally.next = actions.map(noAnswers);
  for (const his of villain) addHis(tally, hand, his);
  return tally;
}

/** What he does next after one action, as shares of the times the hand takes it. */
function nextShares(next) {
  if (!(next.mass > 0)) return null;
  const of = (x) => x / next.mass;
  const showdownWin = next.showdown > 0 ? next.showdownWin / next.showdown : null;
  return {
    fold: of(next.fold), check: of(next.check), callWorse: of(next.callWorse), callBetter: of(next.callBetter), more: of(next.more), showdownWin,
  };
}

/** What each action costs the hand against its best one, as shares of the pot. */
function gapsOf(hand, pot) {
  if (!hand.values) return null;
  const best = Math.max(...hand.values);
  return hand.values.map((v) => (best - v) / pot);
}

export function handRow(hand, { villain, actions, pot }) {
  const tally = tallyAgainst(hand, villain, actions);
  const gaps = gapsOf(hand, pot);
  return {
    hand,
    equity: share(tally.win, tally.mass),
    beats: share(tally.worse, tally.mass),
    gaps,
    fine: gaps ? gaps.map((g) => g <= MISTAKE) : actions.map(() => true),
    next: tally.next.map(nextShares),
    folds: tally.next.map((n) => (n.mass > 0 ? n.fold / n.mass : null)),
    whenCalled: tally.next.map((n) => (n.cont > 1e-9 ? n.win / n.cont : null)),
    removesBetter: share(tally.blockedBetter, tally.allBetter),
    removesWorse: share(tally.blockedWorse, tally.allWorse),
  };
}
