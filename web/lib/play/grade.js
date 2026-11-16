// How a move of hero's stands against the solution for the hand he held: good where the solution takes it often,
// acceptable where it takes it sometimes, an error where it (nearly) never does.
import { pct } from '../cards.js';

const GOOD = 0.2; const SOME = 0.03;
const WORD = { fold: 'folds', check: 'checks', call: 'calls', bet: 'bets', raise: 'raises', allin: 'goes all-in' };
const does = (a) => (a.kind === 'bet' ? `bets ${a.label.replace(/^[A-Za-z]+/, '')}% pot` : a.kind === 'raise' ? `raises ${a.label.replace(/^[A-Za-z]+/, '')}` : WORD[a.kind] ?? a.label);

/** The grade of an action that carries the solution's mix: its level, a word for it, and what the solution does. */
export function gradeOf(action) {
  const mix = action?.mix; if (!mix) return null;
  const mine = mix.find((m) => m.label === action.label); const best = mix.reduce((b, m) => (m.freq > b.freq ? m : b), mix[0]); if (!mine) return null;
  const level = mine.freq >= GOOD ? 'good' : mine.freq >= SOME ? 'ok' : 'error';
  const text = level === 'good' ? `Good: the solver ${does(mine)} ${pct(mine.freq)}% of the time`
    : level === 'ok' ? `Acceptable: the solver does this ${pct(mine.freq)}% of the time, and ${does(best)} ${pct(best.freq)}%`
      : `Error: the solver does this ${pct(mine.freq)}% of the time, and ${does(best)} ${pct(best.freq)}%`;
  return { level, word: { good: 'Good', ok: 'Acceptable', error: 'Error' }[level], text, freq: mine.freq, best };
}
