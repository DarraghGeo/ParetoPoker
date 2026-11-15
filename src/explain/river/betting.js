// First to act with a hand that bets: for value, as a bluff, or small to set the price.
import { cardsHelp } from './cards.js';
import { facesBetOf, openingOf } from './first-words.js';
import { mostly, strongerThanYou, weakerThanYou, withList } from './his-range.js';
import { isBluff, pct } from './terms.js';
import { checksOf, label, say } from './view.js';

/** The nearest other bet size in one direction (`way` 1 for bigger, -1 for smaller), when the hand rarely takes it. */
function rareSize(view, way) {
  const { row, actions, hand, mainBet } = view;
  const sizes = view.bets.filter((a) => a !== mainBet && row.whenCalled[a] != null);
  const beyond = sizes.filter((a) => way * (actions[a].add - actions[mainBet].add) > 0);
  const next = beyond.sort((a, b) => way * (actions[a].add - actions[b].add))[0];
  return next != null && hand.strategy[next] < 0.1 ? next : null;
}

/** Why this size: what continues against the next size up, or that the hand takes the big one. */
function saySize(view, called) {
  const { row, mainBet } = view;
  const bigger = rareSize(view, 1);
  if (bigger != null && row.whenCalled[bigger] < called - 0.03) {
    say(view, 'size', `It does not go bigger: against what continues versus ${label(view, bigger)} `
      + `you would be ahead only ${pct(row.whenCalled[bigger])}. The bigger the bet, the stronger the hands that pay it.`);
  } else if (rareSize(view, -1) != null && row.whenCalled[mainBet] >= 0.6) {
    say(view, 'size', `It can take the big size: even the hands that continue against ${label(view, mainBet)} `
      + `lose to you ${pct(called)} of the time, so a smaller bet would only win less from them.`);
  }
}

function sayValue(view, called, thin) {
  const { mainBet } = view;
  const n = view.row.next[mainBet];
  const paysOff = mostly(view, (his) => (weakerThanYou(view, his) ? his.answers[mainBet]?.call ?? 0 : 0));
  const beatsYou = mostly(view, (his) => (strongerThanYou(view, his) ? 1 - (his.answers[mainBet]?.fold ?? 1) : 0));
  say(view, 'value', `He pays you with worse ${pct(n?.callWorse ?? 0)} of the time${withList(paysOff)}, `
    + `and continues with better ${pct((n?.callBetter ?? 0) + (n?.more ?? 0) * (1 - called))}${withList(beatsYou)}.`
    + `${thin ? ' Anything weaker is called by better too often to bet for value.' : ''}`);
}

function valueBet(view, called) {
  const bet = label(view, view.mainBet);
  const thin = called < 0.55;
  view.line = thin
    ? `${openingOf(view)} It is about the weakest hand you can bet for value: when he does not fold to ${bet} you win ${pct(called)}, a coin flip.`
    : `${openingOf(view)} You bet it for value: when he does not fold to ${bet} you are still ahead ${pct(called)} of the time.`;
  sayValue(view, called, thin);
  saySize(view, called);
  if (!(checksOf(view) > 0.1)) return;
  say(view, 'trap', `It also checks ${pct(checksOf(view))} of the time. He bets ${pct(facesBetOf(view) ?? 0)} of the time when checked to, `
    + 'and if your checks never held a hand like this he could do that freely.');
}

function bluffBet(view) {
  const { row, mainBet } = view;
  const size = view.s.sizes[mainBet];
  view.line = row.equity < 0.03
    ? `${openingOf(view)} You bluff with it: checking never wins, so the bet gives up nothing you would have won.`
    : `${openingOf(view)} You bluff with it: checking wins only ${pct(row.equity)}, so there is little to lose by betting.`;
  const folded = withList(mostly(view, (his) => his.answers[mainBet]?.fold ?? 0));
  say(view, 'bluff', `${label(view, mainBet)} needs him to fold ${pct(size.needsFolds)} of the time to pay for itself, `
    + `and against this hand he folds ${pct(row.next[mainBet]?.fold ?? 0)}${folded}. ${cardsHelp(view, mainBet)}`);
  if (!(checksOf(view) > 0.1)) return;
  say(view, 'quota', 'It does not bluff every time because you hold more hands this weak than you can bluff with. '
    + `At this size bluffs can be about ${pct(size.wanted)} of your bets before he simply calls you down, `
    + `and they are ${pct(size.bluffShare)} already; the rest of your weak hands have to give up.`);
}

function blockBet(view, called) {
  const { row } = view;
  const bet = label(view, view.mainBet);
  const n = row.next[view.mainBet];
  view.line = `${openingOf(view)} That is too weak to bet for value, since called by ${bet} you win only ${pct(called ?? 0)}, `
    + 'and too strong to give up on. You bet small to set the price yourself.';
  say(view, 'block', `If you check he bets ${pct(facesBetOf(view) ?? 0)} of the time and picks the size, `
    + `and you are left guessing with a hand that beats ${pct(row.equity)} of his range. `
    + `Against ${bet} he folds ${pct(n?.fold ?? 0)}, calls with worse ${pct(n?.callWorse ?? 0)} and raises only ${pct(n?.more ?? 0)}.`);
  if (!(checksOf(view) > 0.1)) return;
  say(view, 'mix', `It checks ${pct(checksOf(view))} of the time as well: the two lines are worth the same to it, `
    + 'and your checking range needs some hands that can call a bet.');
}

export function betReasons(view) {
  const called = view.row.whenCalled[view.mainBet];
  if (called != null && called >= 0.45) valueBet(view, called);
  else if (isBluff(view.row, view.mainBet)) bluffBet(view);
  else blockBet(view, called);
}
