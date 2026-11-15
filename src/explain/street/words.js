// Numbers and frequencies in a player's words.

/** A share in whole percent: 0.374 is "37%". */
export const percent = (x) => `${Math.round(100 * x)}%`;
/** A size in % of the pot, without its sign: whole percent from 3%, else to a tenth. */
export const ofPot = (x) => (Math.abs(x) >= 3 ? `${Math.round(Math.abs(x))}%` : `${(Math.round(Math.abs(x) * 10) / 10).toFixed(1)}%`);
export const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);
/** A bet, a raise or an all-in: an action that puts more in than the other player has. */
export const isWager = (kind) => !['check', 'call', 'fold'].includes(kind);

/** How often, in a word. */
export function often(x, verb) {
  if (x >= 0.97) return `always ${verb}`;
  if (x >= 0.85) return `almost always ${verb}`;
  if (x >= 0.6) return `mostly ${verb}`;
  if (x >= 0.4) return `${verb} about half the time`;
  if (x >= 0.15) return `sometimes ${verb}`;
  return x >= 0.03 ? `rarely ${verb}` : `never ${verb}`;
}

export const listOf = (names) => (names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

const FRACTIONS = [[0.25, 'a quarter'], [1 / 3, 'a third'], [0.5, 'half'], [2 / 3, 'two thirds'], [0.75, 'three quarters']];
/** How much of something, in words a coach would use. */
export function howMuch(x) {
  if (x >= 0.955) return 'nearly all';
  if (x <= 0.05) return 'almost none';
  if (x < 0.19) return 'a small part';
  if (x > 0.82) return 'most';
  return `about ${FRACTIONS.reduce((b, f) => (Math.abs(f[0] - x) < Math.abs(b[0] - x) ? f : b))[1]}`;
}

const TIMES = ['', 'once', 'twice', 'three times', 'four times', 'five times', 'six times', 'seven times', 'eight times', 'nine times'];
/** "about four times in ten": how often, for setting one frequency beside another. */
export function inTen(x) {
  const n = Math.round(10 * x);
  if (n <= 0) return 'almost never';
  return n >= 10 ? 'almost always' : `about ${TIMES[n]} in ten`;
}
