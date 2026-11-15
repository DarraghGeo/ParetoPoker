// The setup as typed: the board, pot, stack and betting read from the form's text (and from an address), and written back.
import { betLists } from '../setup.js';

/** Bet sizes in % of the pot: one list for every street, or one a street apart by a slash; as fractions of the pot. */
export function betsOf(text) {
  const lists = text.split('/').map((part) => part.split(/[\s,]+/).map(Number).filter((x) => x > 0).map((x) => x / 100)).filter((list) => list.length);
  return lists.length > 1 ? lists : lists[0] ?? [];
}
export const raisesOf = (text) => text.split(/[\s,x]+/i).map(Number).filter((x) => x > 1);
export const maxRaisesOf = (x) => Math.max(0, Math.min(4, Math.round(Number(x) || 0)));
export const boardOf = (text) => (String(text ?? '').match(/[2-9TJQKAtjqka][shdcSHDC]/g) ?? []).map((c) => c[0].toUpperCase() + c[1].toLowerCase());
export const goodBoard = (cards) => cards.length >= 3 && cards.length <= 5 && new Set(cards).size === cards.length;
const betsText = (c) => betLists(c).map((list) => list.map((b) => Math.round(100 * b)).join(' ')).join(' / ');

/** The form's fields for a setup. */
export const formOf = (c) => ({ board: c.board, pot: c.pot, stack: c.stack, bets: betsText(c), raise: c.raises.join(' '), max: c.maxRaises, allIn: !!c.allIn });

/** What the form holds: the pot, stack, board and betting, or what is missing. */
export function readForm(f) {
  const bets = betsOf(f.bets); const pot = Number(f.pot); const stack = Number(f.stack);
  const raises = raisesOf(f.raise); const maxRaises = maxRaisesOf(f.max);
  if (!(pot > 0) || !(stack >= 0) || !bets.length) return { error: 'Pot, stack and at least one bet size are needed.' };
  return { pot, stack, board: boardOf(f.board), betting: { bets, raises: maxRaises > 0 ? raises : [], maxRaises: raises.length ? maxRaises : 0, allIn: !!f.allIn } };
}
