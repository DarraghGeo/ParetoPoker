// A spot handed over in the address (Play's "study this spot"): the setup it gives, and where to open in it.
import { betsOf, boardOf, goodBoard, maxRaisesOf, raisesOf } from './form.js';

const CARDS = /[2-9TJQKA][shdc]/g;
const number = (q, key, ok) => { const x = Number(q.get(key)); return q.has(key) && Number.isFinite(x) && ok(x) ? { [key]: x } : {}; };

/** The betting the address gives. */
function bettingOf(q) {
  const out = {}; const bets = betsOf(q.get('bets') ?? '');
  if (bets.length) out.bets = bets;
  if (q.has('raises')) out.raises = raisesOf(q.get('raises'));
  if (q.has('max')) out.maxRaises = maxRaisesOf(q.get('max'));
  if (q.has('allin')) out.allIn = q.get('allin') === '1';
  return out;
}

/** The setup the address gives over the one kept. */
function configOf(q, board) {
  const c = { board: board.join(' '), ...number(q, 'pot', (x) => x > 0), ...number(q, 'stack', (x) => x >= 0), ...bettingOf(q), lite: q.get('lite') === '1' };
  for (const side of ['oop', 'ip']) if (q.get(side)?.trim()) c[side] = q.get(side).trim();
  return c;
}

/** The setup and where to open (the line, the cards dealt, the hand), or null for an address that names no spot. */
export function readAddress(query) {
  const q = new URLSearchParams(query); const board = boardOf(q.get('board'));
  if (!goodBoard(board)) return null;
  const hand = q.get('hand') ?? '';
  const open = { line: (q.get('line') ?? '').split(',').filter(Boolean), dealt: q.get('dealt')?.match(CARDS) ?? [], hand: /^([2-9TJQKA][shdc]){2}$/.test(hand) ? hand : null, resolve: q.get('resolve') === '1' };
  return { config: configOf(q, board), open };
}

/** The query of an address, whether it is a page's (`?…`) or the app's (`#/study?…`). */
export const queryOf = (href) => { const u = new URL(href, location.href); return u.hash.includes('?') ? u.hash.slice(u.hash.indexOf('?')) : u.search; };
