/**
 * "What would change it", from the street played again with one thing changed (web/worker.js `whatIf`): the frequency the
 * range bets (or, facing a bet, folds) as things are, and with each change. Said in the order of how much each moves it.
 * A move under seven points is said to be none: the two solves are not exact to more than that.
 */
import { percent, howMuch, listOf, capitalize } from '../words.js';

const BIG = 0.07;
const NAME = {
  hisLess: 'without his strongest hands', myLess: 'without your own strongest hands',
  noRaise: 'if he could not raise', noStab: 'if he could not bet when checked to',
};

const much = (x) => { const t = howMuch(x); return /^(most|a small part|nearly all|almost none)$/.test(t) ? `${t} of it` : t; };
const only = (x) => (x <= 0.05 ? 'hardly bet at all' : `bet only ${much(x)}`);
const foldOnly = (x) => (x <= 0.05 ? 'hardly fold at all' : `fold only ${much(x)}`);

/** What each change does to the betting, first to act: (frequency with the change, whether it is higher, frequency as it is). */
const ACTING = {
  hisLess: (to, up, base) => (up
    ? `Take the strongest hands out of his range and you would bet ${howMuch(to)} of yours instead of ${howMuch(base)}: it is those hands of his that hold you back.`
    : `Take the strongest hands out of his range and you would bet less (${much(to)}): much of your betting is aimed at those hands.`),
  myLess: (to, up) => (up ? `Without your own strongest hands you would bet more (${much(to)}): those hands are doing your checking.`
    : `Without your own strongest hands you would ${only(to)}: the rest of the betting leans on those hands being there.`),
  noRaise: (to, up) => (up ? `If he could not raise you would bet ${much(to)}: his raises keep part of your range quiet.`
    : `If he could not raise you would bet less (${much(to)}): some of your bets are there to be raised.`),
  noStab: (to, up) => (up
    ? `If he could not bet when checked to you would bet ${much(to)}: the chance that he bets is part of what makes your checks worth making.`
    : `If he could not bet when checked to you would bet less (${much(to)}): some of your bets are made so as not to face his.`),
};
/** What each change does to the folding, facing a bet. */
const FACING = {
  hisLess: (to, up, base) => (up ? `Take the strongest hands out of what he holds and you would fold more (${much(to)}).`
    : `Take the strongest hands out of his range and you would ${foldOnly(to)} instead of ${much(base)}: it is those hands you are folding to.`),
  myLess: (to, up) => (up
    ? `Without your own strongest hands you would fold ${much(to)}: the hands below them are only good enough to continue with those above them in the range.`
    : `Without your own strongest hands you would fold less (${much(to)}): the rest would have to do the defending.`),
};

function nothingMoves(r, quiet, verb) {
  const tried = listOf(quiet).replace(/ and /, ' or ');
  if (r.facing) return `Not the hands: ${tried}, your range would fold about as often. How much you fold is set by the price he lays you, so that his bluffs ` +
    `do not pay.`;
  return `Nothing tried moves it: ${tried}, your range would ${verb} about as often. It comes from how the two ranges meet this board as a whole.`;
}

function priceSaid(close) {
  if (close <= 0.1) return 'A bigger bet would change little: almost everything you continue with could pay a quarter of the pot more.';
  return `A bigger bet would: ${close >= 0.9 ? 'almost all' : howMuch(close)} of what you continue with is close enough to fold if it cost a quarter of ` +
    `the pot more.`;
}

/** Each change tried, with how far it moves the frequency, the largest first. */
function changesOf(r) {
  return [['hisLess', r.hisLess], ['myLess', r.myLess], ['noRaise', r.noRaise], ['noStab', r.noStab]].filter((x) => x[1] != null)
    .map(([id, to]) => ({ id, to, d: to - r.base })).sort((x, y) => Math.abs(y.d) - Math.abs(x.d));
}

export function sayChanges(r) {
  if (!r || r.base == null) return null; const verb = r.facing ? 'fold' : 'bet'; const said = [];
  const numbers = [`Solved again as it is, your range ${verb}s ${percent(r.base)} of the time. The strongest hands are the top 20% of a range by equity.`];
  const items = changesOf(r); const sentences = r.facing ? FACING : ACTING;
  for (const it of items) {
    numbers.push(`${capitalize(NAME[it.id])}: ${percent(it.to)}.`);
    if (!(Math.abs(it.d) < BIG) && sentences[it.id]) said.push(sentences[it.id](it.to, it.d > 0, r.base));
  }
  const quiet = items.filter((it) => Math.abs(it.d) < BIG).map((it) => NAME[it.id]);
  if (quiet.length && said.length) said.push(`It would be much the same ${listOf(quiet).replace(/, and | and /g, (m) => m.replace('and', 'or'))}.`);
  if (!said.length) said.push(nothingMoves(r, quiet, verb));
  if (r.facing && r.close != null) {
    said.push(priceSaid(r.close)); numbers.push(`${percent(r.close)} of what continues is worth less than a quarter of the pot more than folding.`);
  }
  return { id: 'change', text: `What would change it. ${said.join(' ')}`, detail: numbers.join(' ') };
}
