import { cardsOf } from '../../combos.js';
import { FLUSH, STRAIGHT, STRAIGHT_FLUSH, ranksOf } from './cards.js';

/** Outs to a draw: eight or more is a flush draw or an open-ended one, four to seven a gutshot. */
export const DRAW_OUTS = 8;
export const GUTSHOT_OUTS = 4;

/** The draw a hand's outs make, by the strongest that fits. */
export function drawName(flushOuts, straightOuts) {
  if (flushOuts >= DRAW_OUTS) return 'flush draw';
  if (straightOuts >= DRAW_OUTS) return 'open-ended';
  return straightOuts >= GUTSHOT_OUTS ? 'gutshot' : null;
}

/**
 * What a hand is on a flop or a turn, in the words players use, each one defined so that it can
 * be checked by dealing the cards out:
 *
 *   made      the hand's category now (pair, two pair, ...), from the evaluator
 *   own       how far the two hole cards lift it above what the board makes alone (0: they do not)
 *   pair      for one pair of its own: 'overpair', 'top pair', 'middle pair', 'bottom pair', 'underpair'
 *   flushOuts / straightOuts   next cards that make it a flush / a straight it does not have yet
 *   draw      'flush draw' (8+ outs), 'open-ended' (8+ straight outs), 'gutshot' (4 to 7), or null
 *
 * Outs are counted by trying every card left in the deck, not by pattern: a card is an out when
 * the evaluator says the hand has become that category.
 */
export function features(fs, board, combo) {
  const [a, b] = cardsOf(fs, combo);
  const made = fs.categoryOf(fs.evaluateCards([...board, a, b]));
  // what the board makes for anyone, with no hole cards
  const boardMade = fs.categoryOf(fs.evaluateCards(board));
  const own = made - boardMade;
  const ra = fs.rankOf(a); const rb = fs.rankOf(b);
  // one pair made with the hole cards: a pocket pair, or one card matching the board
  const pair = own === 1 && (made === 1 || made === 2) ? pairOf(fs, board, ra, rb) : null;
  const { flushOuts, straightOuts } = board.length < 5 ? outsOf(fs, board, [a, b], made) : { flushOuts: 0, straightOuts: 0 };
  const draw = made >= STRAIGHT ? null : drawName(flushOuts, straightOuts);
  return { made, boardMade, own, pair, flushOuts, straightOuts, draw, pocket: ra === rb, high: Math.max(ra, rb) };
}

function pairOf(fs, board, ra, rb) {
  const onBoard = ranksOf(fs, board);
  const ranks = [...onBoard].sort((x, y) => y - x);
  const top = ranks[0];
  const bottom = ranks[ranks.length - 1];
  if (ra === rb) return ra > top ? 'overpair' : ra < bottom ? 'underpair' : 'middle pair';
  const hit = onBoard.has(ra) ? ra : onBoard.has(rb) ? rb : null;
  if (hit == null) return null;
  return hit === top ? 'top pair' : hit === bottom ? 'bottom pair' : 'middle pair';
}

/** Next cards that make the hand a flush or a straight with its own cards, not one the board deals to everybody. */
function outsOf(fs, board, hole, made) {
  let flushOuts = 0; let straightOuts = 0;
  const used = new Set([...board, ...hole]);
  for (let x = 0; x < 52; x++) {
    if (used.has(x)) continue;
    const next = fs.categoryOf(fs.evaluateCards([...board, x, ...hole]));
    const forAll = fs.categoryOf(fs.evaluateCards([...board, x]));
    if ((next === FLUSH || next === STRAIGHT_FLUSH) && made < FLUSH && forAll < FLUSH) flushOuts++;
    else if (next === STRAIGHT && made < STRAIGHT && forAll !== STRAIGHT) straightOuts++;
  }
  return { flushOuts, straightOuts };
}
