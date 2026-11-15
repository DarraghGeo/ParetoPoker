import { cardsOf } from '../../combos.js';
import { FLUSH, STRAIGHT, backdoorFlush, backdoorStraight, highRank, overcards } from './cards.js';
import { DRAW_OUTS, GUTSHOT_OUTS } from './made.js';

/**
 * Every name that fits a hand, uncompressed: its made hand, each draw it has, and its overcards.
 * A hand can carry several (top pair and a flush draw). `TAG_ORDER` is strongest first.
 */
export const TAG_ORDER = [
  'Straight flush', 'Four of a kind', 'Full house', 'Flush', 'Straight', 'Three of a kind', 'Set', 'Trips', 'Two pair',
  'Pair', 'Overpair', 'Top pair', 'Middle pair', 'Bottom pair', 'Underpair',
  'Combo draw', 'Flush draw', 'Open-ended straight draw', 'Gutshot', 'Backdoor flush draw', 'Backdoor straight draw',
  'Two overcards', 'One overcard', 'High card', 'Ace high', 'King high', 'Queen high', 'Lower high card', 'No pair',
];
const PAIR_TAGS = { overpair: 'Overpair', 'top pair': 'Top pair', 'middle pair': 'Middle pair', 'bottom pair': 'Bottom pair', underpair: 'Underpair' };
const OVERCARD_TAGS = [null, 'One overcard', 'Two overcards'];

export function tagsOf(fs, board, combo, f) {
  const hole = cardsOf(fs, combo);
  const out = madeTags(fs, board, hole, f);
  if (board.length !== 5) out.push(...drawTags(fs, board, hole, f));
  return out;
}

/** The made hand, and the wider family it belongs to: a set is also three of a kind, top pair is also a pair. */
function madeTags(fs, board, hole, f) {
  if (f.own >= 2 || f.made >= STRAIGHT) return strongTags(f);
  if (f.own === 1) return f.pair ? [PAIR_TAGS[f.pair] ?? 'Pair', 'Pair'] : ['Pair'];
  if (board.length === 5) return [highCardTag(highRank(fs, hole)), 'High card'];
  return ['No pair'];
}

function strongTags(f) {
  const out = [['', '', 'Two pair', f.pocket ? 'Set' : 'Trips', 'Straight', 'Flush', 'Full house', 'Four of a kind', 'Straight flush'][f.made] || 'Two pair'];
  if (f.made === 3) out.push('Three of a kind');
  if (f.made === 8) out.push('Straight', 'Flush');
  return out;
}

const highCardTag = (high) => (high === 12 ? 'Ace high' : high === 11 ? 'King high' : high === 10 ? 'Queen high' : 'Lower high card');

/** Every draw it has, whatever it has made already: a straight can hold a flush draw, a pair a gutshot. */
function drawTags(fs, board, hole, f) {
  const out = [];
  const flush = f.flushOuts >= DRAW_OUTS;
  const straight = f.straightOuts >= GUTSHOT_OUTS;
  if (flush) out.push('Flush draw');
  if (f.straightOuts >= DRAW_OUTS) out.push('Open-ended straight draw'); else if (straight) out.push('Gutshot');
  if (flush && straight) out.push('Combo draw');
  const flop = board.length === 3;
  if (flop && !flush && f.made < FLUSH && backdoorFlush(fs, board, hole)) out.push('Backdoor flush draw');
  // on the flop, with no straight draw yet
  if (flop && !straight && f.made < STRAIGHT && backdoorStraight(fs, board, hole)) out.push('Backdoor straight draw');
  // cards above the board: a bottom pair can still hold an overcard
  const over = f.own <= 1 && f.made < STRAIGHT && !f.pocket ? OVERCARD_TAGS[overcards(fs, board, hole)] : null;
  if (over) out.push(over);
  return out;
}
