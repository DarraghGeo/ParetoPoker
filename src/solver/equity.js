// Each hand's equity against a range on a board of three, four or five cards, every card still to come dealt out, with
// the cards each hand removes from the other range. Counted by poker-bitvaljs, exactly and for both ranges in one pass
// (it evaluates each hand once for each runout and counts every matchup at once).
import BitVal from 'poker-bitvaljs';

const bitval = new BitVal();
let names = null;
/** Every combination's name, as the solver writes it ("AsKd"). */
const namesOf = (fs) => (names ??= Array.from({ length: fs.COMBOS }, (_, c) => fs.formatCombo(c)));

/** A range as bitval takes it: the hands held clear of the board, each with its weight, and which combination each is. */
function entries(fs, weights, board) {
  const all = namesOf(fs); const taken = new Uint8Array(52); for (const c of board) taken[c] = 1; const ids = []; const list = [];
  for (let c = 0; c < fs.COMBOS; c++) {
    if (!(weights[c] > 0) || taken[fs.COMBO_CARDS[2 * c]] || taken[fs.COMBO_CARDS[2 * c + 1]]) continue;
    ids.push(c); list.push({ hand: all[c], weight: weights[c] });
  }
  return { ids, list };
}

/** One side's results as equities, one per combination: NaN where a hand is not held or has nothing to face. */
function shares(fs, ids, side, at = (i) => i) {
  const out = new Float64Array(fs.COMBOS).fill(NaN);
  ids.forEach((c, i) => { const k = at(i); const n = side.win[k] + side.tie[k] + side.lose[k]; if (n > 0) out[c] = (side.win[k] + side.tie[k] / 2) / n; });
  return out;
}

/** The two ranges compared: bitval's result with which combination each row is; null when either range is empty. */
function compared(fs, board, mine, his, total, options) {
  const H = entries(fs, mine, board); const V = entries(fs, his, board);
  if (!H.list.length || !V.list.length) return null;
  const cards = board.map((c) => fs.formatCard(c));
  return { H, V, r: bitval.compareRangeHandsSync(H.list, V.list, cards, [], total, 1, true, options) };
}

/**
 * Both ranges' equities against each other, from one pass.
 * @param {number[]} board
 * @param {ArrayLike<number>} mine Weights, one per combination.
 * @param {ArrayLike<number>} his
 * @param {number} [total] How many board cards the hands are compared on: five (every runout), or the board's own
 *   count for how they stand with no more cards dealt.
 * @returns {[Float64Array, Float64Array]} NaN where a hand is not held or has nothing to face.
 */
export function bothEquities(fs, board, mine, his, total = 5) {
  const c = compared(fs, board, mine, his, total);
  const none = () => new Float64Array(fs.COMBOS).fill(NaN);
  return c ? [shares(fs, c.H.ids, c.r.hero), shares(fs, c.V.ids, c.r.villain)] : [none(), none()];
}

/** Each of `mine`'s hands' equity against `his` range. */
export const equityVs = (fs, board, mine, his) => bothEquities(fs, board, mine, his)[0];

/** Each of `mine`'s hands' equity once each card that can come next has: `[{ card, eq }]` in card order; none on the river. */
export function equityByCard(fs, board, mine, his) {
  if (board.length >= 5) return [];
  const c = compared(fs, board, mine, his, 5, { byCard: true }); const taken = new Uint8Array(52); for (const x of board) taken[x] = 1; const out = [];
  for (let x = 0; x < 52; x++) {
    if (taken[x]) continue;
    const k = bitval.cardIndex(fs.formatCard(x));
    out.push({ card: x, eq: c ? shares(fs, c.H.ids, c.r.hero.byCard, (i) => i * 52 + k) : new Float64Array(fs.COMBOS).fill(NaN) });
  }
  return out;
}
