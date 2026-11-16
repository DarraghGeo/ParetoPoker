// The butterfly chart: both ranges back to back in rows by what each hand has made with its own cards on the board, the
// strongest row on top. A row holds the hands of the range to act (weakest outermost) and the other range's share.
const RANKS = '23456789TJQKA';
/** The rows, weakest first: a short code and its name. */
export const ROWS = [['Air', 'Nothing'], ['DR', 'A draw'], ['LP', 'Low pair'], ['MP', 'Middle pair'], ['TP', 'Top pair'], ['OP', 'Overpair'], ['2P', 'Two pair'], ['TR+', 'Trips or better']];
const cardsOf = (text) => (String(text).match(/[2-9TJQKA][shdc]/g) ?? []).map((c) => ({ r: RANKS.indexOf(c[0]), s: c[1] }));

/** The top card of the best straight in a set of ranks, or -1; the ace plays low too. */
function straightTop(ranks) {
  const have = new Set(ranks); if (have.has(12)) have.add(-1);
  for (let top = 12; top >= 3; top--) if ([0, 1, 2, 3, 4].every((k) => have.has(top - k))) return top;
  return -1;
}
const suited = (hole, board, n) => 'shdc'.split('').some((s) => hole.some((c) => c.s === s) && board.filter((c) => c.s === s).length < 5 && [...hole, ...board].filter((c) => c.s === s).length === n);
const flush = (hole, board) => 'shdc'.split('').some((s) => hole.some((c) => c.s === s) && board.filter((c) => c.s === s).length < 5 && [...hole, ...board].filter((c) => c.s === s).length >= 5);

/** A draw with no pair: four to a flush, or two ranks that would each complete a straight (not on the river). */
function drawing(hole, board) {
  if (board.length >= 5) return false; if (suited(hole, board, 4)) return true;
  const ranks = [...hole, ...board].map((c) => c.r); const now = straightTop(ranks); let outs = 0;
  for (let r = 0; r < 13; r++) if (!ranks.includes(r) && straightTop([...ranks, r]) > now) outs++;
  return outs >= 2;
}

/** The row a hand sits in on a board, 0 (nothing) to 7 (trips or better), counting only what its own cards add. */
export function rowOf(hand, boardText) {
  const hole = cardsOf(hand); const board = cardsOf(boardText); const on = board.map((c) => c.r); const tops = [...new Set(on)].sort((a, b) => b - a);
  const count = (r) => on.filter((x) => x === r).length + hole.filter((c) => c.r === r).length;
  if (flush(hole, board) || straightTop([...on, ...hole.map((c) => c.r)]) > straightTop(on) || hole.some((c) => count(c.r) >= 3)) return 7;
  const pocket = hole[0].r === hole[1].r; const hit = hole.filter((c) => on.includes(c.r));
  if (!pocket && hit.length === 2) return 6;
  if (pocket) return hole[0].r > tops[0] ? 5 : hole[0].r >= (tops[1] ?? -1) ? 3 : 2;
  if (hit.length) return hit[0].r === tops[0] ? 4 : hit[0].r === tops[1] ? 3 : 2;
  return drawing(hole, board) ? 1 : 0;
}

/** The chart's rows, strongest first, leaving out rows neither range holds: the hands to act's by row, weakest first,
 *  each bar's width as a share of the widest (in percent). */
export function butterflyRows(hands, boardText) {
  const rows = ROWS.map(([code, name], lv) => ({ lv, code, name, hero: [], mine: 0, his: 0 })); let mine = 0, his = 0;
  for (const h of hands.hero) { const r = rows[rowOf(h.name, boardText)]; r.hero.push(h); r.mine += h.w; mine += h.w; }
  for (const v of hands.villain) { rows[rowOf(v.name, boardText)].his += v.w; his += v.w; }
  const shown = rows.filter((r) => r.mine > 0 || r.his > 0).map((r) => ({ ...r, mine: r.mine / (mine || 1), his: r.his / (his || 1) }));
  const most = Math.max(0.0001, ...shown.flatMap((r) => [r.mine, r.his]));
  return shown.reverse().map((r) => ({ ...r, share: r.mine, hisShare: r.his, mine: (100 * r.mine) / most, his: (100 * r.his) / most }));
}
