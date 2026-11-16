// The answer first: what the hand does, and what kind of play that is; and its actions named in a sentence.
import { isWager } from '../words.js';
import { mergedBet } from './merged.js';

/** An action in words: checking, calling, the 33% bet, raising. */
export function actionLabel(m) {
  const raises = m.actions.filter((x) => x.kind === 'raise').length;
  return (i) => {
    const x = m.actions[i]; const n = /\d+/.exec(x.label)?.[0];
    if (x.kind === 'check') return 'checking'; if (x.kind === 'call') return 'calling'; if (x.kind === 'fold') return 'folding';
    if (x.kind === 'allin') return 'going all in';
    if (x.kind === 'raise') return raises > 1 ? `raising (${x.label})` : 'raising';
    return n ? `the ${n}% bet` : 'betting';
  };
}

/** What a bet or raise is for: value, a bluff, both at once (a merged bet), to make him fold, or nothing said. */
function purpose(h, i) {
  const { m, made, river } = h;
  if (mergedBet(h, i)) return ', part for value and part as a bluff (a merged bet)';
  const needs = made.some((c) => c.kind === 'needs' && c.a === i); const builds = made.some((c) => c.kind === 'builds' && c.a === i);
  const ahead = m.actions[i].aheadWhenCalled;
  if (river) return ahead != null && ahead >= 0.5 ? ' for value' : needs && (ahead == null || ahead < 0.35) ? ' as a bluff' : builds ? ' for value' : '';
  return builds ? ' for value' : needs && m.equity < 0.5 ? ' to make him fold' : '';
}

/** "You bet for value, and sometimes check. It is top pair." */
export function answerLine(h) {
  const { m, taken, facing, what } = h; const top = taken[0]; const kindOf = (i) => m.actions[i].kind;
  if (top == null) return `You have ${what}.`;
  const verb = (i) => (kindOf(i) === 'check' ? 'check' : kindOf(i) === 'call' ? 'call' : kindOf(i) === 'fold' ? 'fold' : facing ? 'raise' : 'bet');
  const play = (i) => `${verb(i)}${isWager(kindOf(i)) ? purpose(h, i) : ''}`;
  const second = taken.find((i) => i !== top && verb(i) !== verb(top) && m.actions[i].sigma >= 0.25);
  const first = play(top); const and = first.endsWith(')') ? '; you sometimes' : ', and sometimes';
  return (second != null ? `You ${first}${and} ${play(second)}. ` : `You ${first}. `) + `It is ${what}.`;
}
