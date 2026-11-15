// First to act with a hand that checks: a trap, a hand that takes the showdown, or one that gives up.
import { afterCheckOf, facesBetOf, openingOf } from './first-words.js';
import { mostly, strongerThanYou, weakerThanYou, withList } from './his-range.js';
import { BLUFF, isBluff, pct } from './terms.js';
import { label, say } from './view.js';

function trapCheck(view) {
  view.line = `${openingOf(view)} It could bet for value and checks instead: `
    + `he bets ${pct(facesBetOf(view) ?? 0)} of the time when checked to, straight into it.`;
  say(view, 'trap', `Your checks need hands like this. Hands of exactly this strength check ${pct(view.level.mix[view.check])} of the time `
    + 'across your range, and that is what stops him betting at every check.');
}

/** His hands that a bet at `probe` would fold out of what you beat, and that would pay it of what beats you. */
function whatABetMeets(view, probe) {
  if (!(probe >= 0)) return { foldsOut: '', callsYou: '' };
  return {
    foldsOut: mostly(view, (his) => (weakerThanYou(view, his) ? his.answers[probe]?.fold ?? 0 : 0)),
    callsYou: mostly(view, (his) => (strongerThanYou(view, his) ? 1 - (his.answers[probe]?.fold ?? 1) : 0)),
  };
}

function showdownCheck(view, probe, probeLabel, wouldWin) {
  const { foldsOut, callsYou } = whatABetMeets(view, probe);
  view.line = `${openingOf(view)} You check and take the showdown, because a bet gets called by the wrong hands: `
    + `of what continues against ${probeLabel} you beat only ${pct(wouldWin ?? 0)}.`;
  say(view, 'showdown', `Betting folds out what you beat${withList(foldsOut, ': ')} and gets paid by what beats you${withList(callsYou, ': ')}. `
    + `Checked, he checks behind ${pct(afterCheckOf(view)?.check ?? 0)} of the time and you win your share at showdown; `
    + `the ${pct(facesBetOf(view) ?? 0)} he bets is a separate decision.`);
}

/** The hands that do the bluffing at `probe`: what he folds to them and what they win when checked. */
function bluffers(rows, probe) {
  let w = 0, f = 0, e = 0;
  for (const r of rows) {
    const b = probe >= 0 && isBluff(r, probe) ? r.hand.weight * r.hand.strategy[probe] : 0;
    if (b > 0 && r.folds[probe] != null) { w += b; f += b * r.folds[probe]; e += b * r.equity; }
  }
  return { theirFold: w > 0 ? f / w : null, theirEquity: w > 0 ? e / w : null };
}

/** Why this hand gives up where the hands that bluff instead do not. */
function whyNotBluff(view, probe, size) {
  const { theirFold, theirEquity } = bluffers(view.s.rows, probe);
  const mineFold = probe >= 0 ? view.row.folds[probe] : null;
  if (!size || theirFold == null || mineFold == null) return '';
  if (theirEquity != null && view.row.equity - theirEquity > 0.03) {
    return `The hands you bluff with instead win ${pct(theirEquity)} when checked, less than this one, so they lose nothing by betting.`;
  }
  if (theirFold - mineFold > 0.015) {
    return `The hands you bluff with instead have better cards for it: he folds ${pct(theirFold)} to them and ${pct(mineFold)} to this one, `
      + 'because this hand holds cards his folding hands would need.';
  }
  return 'Nothing makes it a worse bluff than the hands you do bluff with; there are simply more hands this weak than you can bluff.';
}

function giveUp(view, probe, probeLabel) {
  const { row } = view;
  const size = probe >= 0 ? view.s.sizes[probe] : null;
  const stillWins = row.equity >= 0.03 ? `: checked down it still wins ${pct(row.equity)}, and a bluff would throw that away` : '';
  view.line = `${openingOf(view)} You give up with it${stillWins}.`;
  const quota = size ? ` At ${probeLabel} bluffs can be about ${pct(size.wanted)} of your bets, and they are ${pct(size.bluffShare)} already.` : '';
  say(view, 'give-up', `${whyNotBluff(view, probe, size)}${quota}`);
}

export function checkReasons(view) {
  const { row, mainBet } = view;
  const probe = mainBet >= 0 ? mainBet : view.bets[0];
  const wouldWin = probe >= 0 ? row.whenCalled[probe] : null;
  const probeLabel = probe >= 0 ? label(view, probe) : 'a bet';
  if (row.equity >= 0.75 && wouldWin != null && wouldWin >= 0.5) trapCheck(view);
  else if (row.equity >= BLUFF) showdownCheck(view, probe, probeLabel, wouldWin);
  else giveUp(view, probe, probeLabel);
}
