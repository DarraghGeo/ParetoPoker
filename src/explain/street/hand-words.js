// Hands in a player's words: one hand as it is described, his hands as a blocker names them, a range's hands as a coach
// groups them, and cards with their suit symbols.
import { firstCard, secondCard } from '../../combos.js';

const RANK_WORD = ['two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'jack', 'queen', 'king', 'ace'];
const MADE = ['', 'a pair', 'two pair', 'three of a kind', 'a straight', 'a flush', 'a full house', 'four of a kind', 'a straight flush'];
const PAIR = { overpair: 'an overpair', underpair: 'an underpair', 'top pair': 'top pair', 'middle pair': 'middle pair', 'bottom pair': 'bottom pair' };
const SUIT = { s: '♠', h: '♥', d: '♦', c: '♣' };
export const SUIT_NAME = ['spade', 'heart', 'diamond', 'club'];

/** "K♥Q♥" for "KhQh". */
export const pretty = (name) => name.replace(/([2-9TJQKA])([shdc])/g, (_, r, x) => r + SUIT[x]);

function madeWords(feature) {
  if (feature.own >= 2 || feature.made >= 4) return MADE[feature.made];
  return feature.own === 1 ? PAIR[feature.pair] ?? 'a pair' : `${RANK_WORD[feature.high]} high`;
}

function drawWords(feature) {
  if (feature.draw === 'flush draw') return `a flush draw (${feature.flushOuts} outs)`;
  if (feature.draw === 'open-ended') return `a straight draw (${feature.straightOuts} outs)`;
  return feature.draw === 'gutshot' ? `a gutshot (${feature.straightOuts} outs)` : '';
}

/** The hand in a player's words. Every part is from `features`, which is checked card by card. */
export function describe(feature) {
  const made = madeWords(feature); const draw = drawWords(feature);
  if (!draw) return made;
  return feature.own >= 1 ? `${made} with ${draw}` : `${draw}, ${made}`;
}

/** Straight flushes down to two pair, named alike for a blocker and for a coach; null below two pair. */
function strongName(x) {
  if (x.made >= 8) return 'straight flushes'; if (x.made === 7) return 'quads'; if (x.made === 6) return 'full houses'; if (x.made === 5) return 'flushes'; if (x.made === 4) return 'straights';
  if (x.made === 3 && x.own > 0) return x.pocket ? 'sets' : 'trips';
  return x.own >= 2 || (x.made === 2 && x.own >= 1 && x.boardMade === 0) ? 'two pair' : null;
}

/** One of his hands, named the way a player would name what he is blocking. */
export function hisName(x) {
  const strong = strongName(x); if (strong) return strong;
  if (x.own === 1) return x.pair === 'overpair' ? 'overpairs' : x.pair === 'top pair' ? 'top pair' : 'weaker pairs';
  if (x.flushOuts >= 8) return 'flush draws'; if (x.straightOuts >= 4) return 'straight draws';
  return 'unpaired hands';
}

function pairName(x, drawn) {
  const base = x.pair === 'overpair' ? 'overpairs' : x.pair === 'top pair' ? 'top pair' : x.pair === 'underpair' ? 'small pocket pairs'
    : x.pair === 'bottom pair' ? 'bottom pair' : x.pocket ? 'pocket pairs under the top card' : 'middle pair';
  return drawn ? `${base === 'overpairs' ? 'overpairs' : base === 'top pair' ? 'top pair' : 'a pair'} with a draw` : base;
}

function unpairedName(fs, board, combo, x) {
  const top = Math.max(...board.map((c) => fs.rankOf(c))); const lo = Math.min(fs.rankOf(firstCard(fs, combo)), fs.rankOf(secondCard(fs, combo)));
  return x.high === 12 ? 'ace high' : board.length < 5 && lo > top ? 'overcards' : x.high === 11 ? 'king high' : 'low unpaired hands';
}

/** What a coach would call a hand, as a kind of hand. */
export function coachKind(fs, board, combo, x) {
  const strong = strongName(x); if (strong) return strong;
  const fd = x.flushOuts >= 8; const sd = x.straightOuts >= 8; const gut = x.straightOuts >= 4 && !sd;
  if (x.own === 1) return pairName(x, fd || sd);
  if (fd && (sd || gut)) return 'combo draws'; if (fd) return 'flush draws'; if (sd) return 'open-ended straight draws'; if (gut) return 'gutshots';
  return unpairedName(fs, board, combo, x);
}
