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

/**
 * What a player would call the hand, one name a hand: its made hand if it has one, else its draw,
 * else what its high cards are against the board. These names behave as buckets: on turns, at the
 * same equity, the draws bet about twice as often as the hands without one (research/proof/buckets.mjs).
 */
export function typeOf(fs, board, combo, f) {
  const a = fs.COMBO_CARDS[2 * combo]; const b = fs.COMBO_CARDS[2 * combo + 1];
  const top = Math.max(...board.map((c) => fs.rankOf(c))); const over = (fs.rankOf(a) > top) + (fs.rankOf(b) > top);
  // three to a flush with a hole card in it, on the flop: a backdoor draw
  let backdoor = false;
  if (board.length === 3) for (let s = 0; s < 4; s++) { const n = [...board, a, b].filter((c) => fs.suitOf(c) === s).length; const mine = [a, b].filter((c) => fs.suitOf(c) === s).length; if (n === 3 && mine >= 1) backdoor = true; }
  const draw = f.flushOuts >= 8 && f.straightOuts >= 4 ? 'combo draw' : f.flushOuts >= 8 ? 'flush draw' : f.straightOuts >= 8 ? 'open-ended' : f.straightOuts >= 4 ? 'gutshot' : null;
  if (f.own >= 2 || f.made >= 4) return 'two pair or better';
  if (f.own === 1) { const p = f.pair === 'top pair' || f.pair === 'overpair' ? 'top pair or overpair' : 'lower pair'; return draw && draw !== 'gutshot' ? `${p} + draw` : p; }
  if (draw) return draw;
  if (board.length === 5) return fs.rankOf(a) === 12 || fs.rankOf(b) === 12 ? 'ace high' : Math.max(fs.rankOf(a), fs.rankOf(b)) >= 10 ? 'king or queen high' : 'lower high card';
  return `${over === 2 ? 'two overcards' : over === 1 ? 'one overcard' : 'no overcard'}${backdoor ? ' + backdoor flush' : ''}`;
}
/** The same names for a group of hands. */
export const TYPES = { 'two pair or better': 'two pair and better', 'top pair or overpair': 'top pairs and overpairs', 'lower pair': 'the lower pairs', 'top pair or overpair + draw': 'top pairs with a draw', 'lower pair + draw': 'lower pairs with a draw', 'combo draw': 'combo draws', 'flush draw': 'flush draws', 'open-ended': 'open-ended straight draws', gutshot: 'gutshots', 'ace high': 'ace-high hands', 'king or queen high': 'king- and queen-high hands', 'lower high card': 'the lowest unpaired hands', 'two overcards': 'two overcards', 'one overcard': 'hands with one overcard', 'no overcard': 'hands with no pair, no draw and no overcard', 'two overcards + backdoor flush': 'two overcards with a backdoor flush draw', 'one overcard + backdoor flush': 'one overcard with a backdoor flush draw', 'no overcard + backdoor flush': 'backdoor flush draws with no overcard' };

/**
 * Every name that fits a hand, uncompressed: its made hand, each draw it has, and its overcards.
 * A hand can carry several (top pair and a flush draw). `TAG_ORDER` is strongest first.
 */
export const TAG_ORDER = ['Straight flush', 'Four of a kind', 'Full house', 'Flush', 'Straight', 'Set', 'Trips', 'Two pair', 'Overpair', 'Top pair', 'Middle pair', 'Bottom pair', 'Underpair', 'Pair', 'Flush draw', 'Open-ended straight draw', 'Gutshot', 'Backdoor flush draw', 'Two overcards', 'One overcard', 'Ace high', 'King high', 'Queen high', 'Lower high card', 'No pair'];
export function tagsOf(fs, board, combo, f) {
  const a = fs.COMBO_CARDS[2 * combo]; const b = fs.COMBO_CARDS[2 * combo + 1]; const out = [];
  const river = board.length === 5;
  if (f.own >= 2 || f.made >= 4) out.push(['', '', 'Two pair', f.pocket ? 'Set' : 'Trips', 'Straight', 'Flush', 'Full house', 'Four of a kind', 'Straight flush'][f.made] || 'Two pair');
  else if (f.own === 1) out.push({ overpair: 'Overpair', 'top pair': 'Top pair', 'middle pair': 'Middle pair', 'bottom pair': 'Bottom pair', underpair: 'Underpair' }[f.pair] ?? 'Pair');
  else if (river) { const high = Math.max(fs.rankOf(a), fs.rankOf(b)); out.push(high === 12 ? 'Ace high' : high === 11 ? 'King high' : high === 10 ? 'Queen high' : 'Lower high card'); }
  else out.push('No pair');
  if (!river && f.made < 4) {
    if (f.flushOuts >= 8) out.push('Flush draw');
    if (f.straightOuts >= 8) out.push('Open-ended straight draw'); else if (f.straightOuts >= 4) out.push('Gutshot');
    if (board.length === 3 && f.flushOuts < 8) for (let s = 0; s < 4; s++) { const n = [...board, a, b].filter((c) => fs.suitOf(c) === s).length; const mine = [a, b].filter((c) => fs.suitOf(c) === s).length; if (n === 3 && mine >= 1) { out.push('Backdoor flush draw'); break; } }
    if (f.own === 0 && f.made < 2) { const top = Math.max(...board.map((c) => fs.rankOf(c))); const over = (fs.rankOf(a) > top) + (fs.rankOf(b) > top); if (over === 2) out.push('Two overcards'); else if (over === 1) out.push('One overcard'); }
  }
  return out;
}
