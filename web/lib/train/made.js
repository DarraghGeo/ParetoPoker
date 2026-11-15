// What a hand has made on a board, counting only what its own two cards add, and how much of a range has made each
// level. Range advantage mostly comes down to who has more top pair or better, as a share of the range.
const ORDER = '23456789TJQKA';
const card = (text) => ({ r: ORDER.indexOf(text[0]), s: text[1] });
const cardsOf = (text) => (String(text).match(/[2-9TJQKA][shdc]/g) ?? []).map(card);

/** The top card of the best straight in a set of ranks, or -1; the ace plays low too. */
function straightTop(ranks) {
  const have = new Set(ranks); if (have.has(12)) have.add(-1);
  for (let top = 12; top >= 3; top--) if ([0, 1, 2, 3, 4].every((k) => have.has(top - k))) return top;
  return -1;
}

/** Whether the hole cards make a flush the board does not make alone. */
function flush(hole, board) {
  return 'shdc'.split('').some((s) => { const on = board.filter((c) => c.s === s).length; return on < 5 && on + hole.filter((c) => c.s === s).length >= 5 && hole.some((c) => c.s === s); });
}

/** One pair or less: an overpair 1.5, top pair 1, another pair 0.5, nothing 0. */
function pairLevel(hole, ranks) {
  const top = Math.max(...ranks); const hit = hole.filter((c) => ranks.includes(c.r));
  if (hole[0].r === hole[1].r) return hole[0].r > top ? 1.5 : 0.5;
  if (!hit.length) return 0;
  return hit.some((c) => c.r === top) ? 1 : 0.5;
}

/** A hand's level on a board: 3 a straight, flush, or trips and better; 2 two pair with both cards; then as `pairLevel`. */
export function made(hand, board) {
  const hole = cardsOf(hand); const on = cardsOf(board); const ranks = on.map((c) => c.r);
  if (flush(hole, on)) return 3;
  if (straightTop([...ranks, ...hole.map((c) => c.r)]) > straightTop(ranks)) return 3;
  if (hole.some((c) => ranks.filter((r) => r === c.r).length + hole.filter((x) => x.r === c.r).length >= 3)) return 3;
  if (hole[0].r !== hole[1].r && hole.every((c) => ranks.includes(c.r))) return 2;
  return pairLevel(hole, ranks);
}

/** A hand as its chart name: "AKs", "QJo", "77". */
export function className(hand) {
  const [a, b] = cardsOf(hand).sort((x, y) => y.r - x.r);
  return a.r === b.r ? ORDER[a.r] + ORDER[b.r] : `${ORDER[a.r]}${ORDER[b.r]}${a.s === b.s ? 's' : 'o'}`;
}

/** How much of a range ({ name, w } hands) has top pair or better, any pair or better, and two pair or better. */
export function counts(hands, board) {
  let all = 0, top = 0, pair = 0, big = 0;
  for (const h of hands) { const m = made(h.name, board); all += h.w; if (m >= 1) top += h.w; if (m > 0) pair += h.w; if (m >= 2) big += h.w; }
  return all > 0 ? { top: top / all, pair: pair / all, big: big / all } : { top: 0, pair: 0, big: 0 };
}

/** The chart names that make most of a range's hands at `level` or better, biggest first. */
export function mostOf(hands, board, level, n = 3) {
  const by = new Map();
  for (const h of hands) if (made(h.name, board) >= level) by.set(className(h.name), (by.get(className(h.name)) ?? 0) + h.w);
  return [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([name]) => name);
}
