import { cardsOf } from '../../combos.js';
import { STRAIGHT, backdoorFlush, highRank, overcards } from './cards.js';
import { isTopPair } from './groups.js';
import { DRAW_OUTS, GUTSHOT_OUTS, drawName } from './made.js';

const OVERCARD_TYPES = ['no overcard', 'one overcard', 'two overcards'];

/**
 * What a player would call the hand, one name a hand: its made hand if it has one, else its draw,
 * else what its high cards are against the board. These names behave as buckets: on turns, at the
 * same equity, the draws bet about twice as often as the hands without one (research/proof/buckets.mjs).
 */
export function typeOf(fs, board, combo, f) {
  const hole = cardsOf(fs, combo);
  const draw = f.flushOuts >= DRAW_OUTS && f.straightOuts >= GUTSHOT_OUTS ? 'combo draw' : drawName(f.flushOuts, f.straightOuts);
  if (f.own >= 2 || f.made >= STRAIGHT) return 'two pair or better';
  if (f.own === 1) return pairType(f, draw);
  if (draw) return draw;
  if (board.length === 5) return highCardType(highRank(fs, hole));
  // three to a flush with a hole card in it, on the flop: a backdoor draw
  const backdoor = board.length === 3 && backdoorFlush(fs, board, hole);
  return `${OVERCARD_TYPES[overcards(fs, board, hole)]}${backdoor ? ' + backdoor flush' : ''}`;
}

function pairType(f, draw) {
  const pair = isTopPair(f) ? 'top pair or overpair' : 'lower pair';
  return draw && draw !== 'gutshot' ? `${pair} + draw` : pair;
}

const highCardType = (high) => (high === 12 ? 'ace high' : high >= 10 ? 'king or queen high' : 'lower high card');

/** The same names for a group of hands. */
export const TYPES = {
  'two pair or better': 'two pair and better',
  'top pair or overpair': 'top pairs and overpairs',
  'lower pair': 'the lower pairs',
  'top pair or overpair + draw': 'top pairs with a draw',
  'lower pair + draw': 'lower pairs with a draw',
  'combo draw': 'combo draws',
  'flush draw': 'flush draws',
  'open-ended': 'open-ended straight draws',
  gutshot: 'gutshots',
  'ace high': 'ace-high hands',
  'king or queen high': 'king- and queen-high hands',
  'lower high card': 'the lowest unpaired hands',
  'two overcards': 'two overcards',
  'one overcard': 'hands with one overcard',
  'no overcard': 'hands with no pair, no draw and no overcard',
  'two overcards + backdoor flush': 'two overcards with a backdoor flush draw',
  'one overcard + backdoor flush': 'one overcard with a backdoor flush draw',
  'no overcard + backdoor flush': 'backdoor flush draws with no overcard',
};
