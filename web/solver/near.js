// A flop one card away from another, and the relabelling of the deck that takes one onto the other, so the new flop's
// solve can start from the old one's (`warmStart` with `warmCards`): about half the iterations of one from nothing.
import * as fs from 'poker-flopsolve';
import { RANKS } from './deck.js';

const rankOf = (card) => fs.rankOf(card); const suitOf = (card) => fs.suitOf(card);

/** The flop with one of its cards a rank higher or lower, to a rank the flop does not hold; null when no card can move. A paired card stays. */
export function nearby(cards) {
  const held = new Set(cards.map(rankOf)); const moves = [];
  cards.forEach((card, k) => {
    if (cards.filter((c) => rankOf(c) === rankOf(card)).length > 1) return;
    for (const step of [-1, 1]) {
      const rank = rankOf(card) + step;
      if (rank >= 0 && rank < RANKS.length && !held.has(rank)) moves.push(cards.map((c, i) => (i === k ? fs.cardOf(rank, suitOf(card)) : c)));
    }
  });
  return moves.length ? moves[Math.floor(Math.random() * moves.length)] : null;
}

/** Pairs each value of the new board with the old one's (rank to rank or suit to suit); false when the two disagree. */
function pairUp(map, used, a, b) {
  if (map[a] >= 0) return map[a] === b;
  if (used.has(b)) return false;
  map[a] = b; used.add(b);
  return true;
}

/** The values not yet paired take the free ones, in order. */
function fillFree(map, used) {
  const free = map.map((_, k) => k).filter((k) => !used.has(k)); let k = 0;
  for (let i = 0; i < map.length; i++) if (map[i] < 0) map[i] = free[k++];
}

/** The relabelling of the deck that takes `board` onto `old`: rank to rank and suit to suit; null when the boards are not the same kind. */
export function onto(board, old) {
  const rank = new Array(13).fill(-1); const suit = new Array(4).fill(-1); const ranks = new Set(); const suits = new Set();
  for (let i = 0; i < board.length; i++) {
    if (!pairUp(rank, ranks, rankOf(board[i]), rankOf(old[i])) || !pairUp(suit, suits, suitOf(board[i]), suitOf(old[i]))) return null;
  }
  fillFree(rank, ranks); fillFree(suit, suits);
  const map = new Uint8Array(52);
  for (let c = 0; c < 52; c++) map[c] = fs.cardOf(rank[rankOf(c)], suit[suitOf(c)]);
  return map;
}
