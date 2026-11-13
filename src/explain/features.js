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
const FLUSH = 5; const STRAIGHT = 4; const STRAIGHT_FLUSH = 8;

export function features(fs, board, combo) {
  const a = fs.COMBO_CARDS[2 * combo]; const b = fs.COMBO_CARDS[2 * combo + 1];
  const made = fs.categoryOf(fs.evaluateCards([...board, a, b]));
  // what the board makes for anyone, with no hole cards
  const boardMade = fs.categoryOf(fs.evaluateCards(board));
  const counts = new Map(); for (const c of board) counts.set(fs.rankOf(c), (counts.get(fs.rankOf(c)) ?? 0) + 1);
  const own = made - boardMade;
  const ra = fs.rankOf(a); const rb = fs.rankOf(b);
  const ranks = [...counts.keys()].sort((x, y) => y - x);
  let pair = null;
  if (own === 1 && (made === 1 || made === 2)) {
    // one pair made with the hole cards: a pocket pair, or one card matching the board
    if (ra === rb) pair = ra > ranks[0] ? 'overpair' : ra < ranks[ranks.length - 1] ? 'underpair' : 'middle pair';
    else { const hit = counts.has(ra) ? ra : counts.has(rb) ? rb : null; if (hit != null) pair = hit === ranks[0] ? 'top pair' : hit === ranks[ranks.length - 1] ? 'bottom pair' : 'middle pair'; }
  }
  let flushOuts = 0; let straightOuts = 0;
  if (board.length < 5) {
    const used = new Set([...board, a, b]);
    for (let x = 0; x < 52; x++) {
      if (used.has(x)) continue;
      const next = fs.categoryOf(fs.evaluateCards([...board, x, a, b]));
      // a flush or a straight the hand makes with its own cards, not one the board deals to everybody
      const forAll = fs.categoryOf(fs.evaluateCards([...board, x]));
      if ((next === FLUSH || next === STRAIGHT_FLUSH) && made < FLUSH && forAll < FLUSH) flushOuts++;
      else if (next === STRAIGHT && made < STRAIGHT && forAll !== STRAIGHT) straightOuts++;
    }
  }
  const draw = made >= STRAIGHT ? null : flushOuts >= 8 ? 'flush draw' : straightOuts >= 8 ? 'open-ended' : straightOuts >= 4 ? 'gutshot' : null;
  return { made, boardMade, own, pair, flushOuts, straightOuts, draw, pocket: ra === rb, high: Math.max(ra, rb) };
}
/**
 * His hands in a handful of groups, for saying what a bet gains against and loses to. One group
 * a hand, by the first that fits:
 *   'strong'       two pair or better made with its own cards (on a paired board: trips or better)
 *   'top pair'     top pair or an overpair
 *   'lower pair'   any other pair of its own
 *   'flush draw'   no pair, eight or more outs to a flush
 *   'straight draw' no pair, eight or more outs to a straight
 *   'nothing'      no pair and no such draw (gutshots and overcards included)
 */
export function groupOf(feature) {
  if (feature.own >= 2 || feature.made >= STRAIGHT) return 'strong';
  if (feature.own === 1) return feature.pair === 'top pair' || feature.pair === 'overpair' ? 'top pair' : 'lower pair';
  if (feature.flushOuts >= 8) return 'flush draw';
  if (feature.straightOuts >= 8) return 'straight draw';
  return 'nothing';
}
export const GROUPS = ['strong', 'top pair', 'lower pair', 'flush draw', 'straight draw', 'nothing'];
