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

/** The line a row shows through its bar, by row (weakest first): from top pair up, how much of his range the hand beats now;
 *  for middle pair and draws, how much of its equity is still to come; for low pair and nothing, how often he folds to it. */
export const LINES = ['folds', 'come', 'folds', 'come', 'now', 'now', 'now', 'now'];
export const LINE_NAMES = { now: 'ahead of his range now', come: 'equity still to come', folds: 'how often he folds to this hand' };

/** How often his range folds to action `a`, seen from each hand to act: his hands that share a card with it are left out. */
function foldsTo(hero, villain, a) {
  const card = new Map(); let all = 0, folds = 0;
  for (const v of villain) { const f = v.weight * (v.answers?.[a]?.fold ?? 0); all += v.weight; folds += f; for (const c of v.cards) { const k = card.get(c) ?? [0, 0]; k[0] += v.weight; k[1] += f; card.set(c, k); } }
  const own = new Map(villain.map((v) => [v.name, v]));
  return new Map(hero.map((h) => {
    const cards = h.row.hand.cards; let w = all, f = folds;
    for (const c of cards) { const k = card.get(c); if (k) { w -= k[0]; f -= k[1]; } }
    for (const v of villain) if (v.cards.includes(cards[0]) && v.cards.includes(cards[1])) { w += v.weight; f += v.weight * (v.answers?.[a]?.fold ?? 0); }   // taken off twice
    return [h.name, w > 0 ? f / w : 0];
  }));
}

/** The rows with their lines: each row's hands sorted along its own measure (lowest outermost), and the line as points
 *  across the bar (x by weight, y from the row's lowest to its highest); a row whose measure barely moves gets a flat one. */
export function lined(rows, parts, decision) {
  const bet = decision.actions.findIndex((x) => ['bet', 'raise', 'allin'].includes(x.kind)); const river = decision.street === 'river';
  const folds = bet >= 0 ? foldsTo(rows.flatMap((r) => r.hero), decision.villain, bet) : null;
  // with no bet to fold to, and on the river with nothing still to come, a row's line is how far ahead its hands are now
  const shownAs = (kind) => ((kind === 'folds' && folds) || (kind === 'come' && !river) ? kind : 'now');
  const measure = (kind, h) => { const p = parts[h.name] ?? [h.e, 0]; return kind === 'folds' ? folds.get(h.name) : kind === 'come' ? p[1] : p[0]; };
  return rows.map((r) => {
    const kind = shownAs(LINES[r.lv]); const hero = r.hero.map((h) => ({ h, v: measure(kind, h) })).sort((a, b) => a.v - b.v || a.h.e - b.h.e);
    const total = hero.reduce((t, x) => t + x.h.w, 0) || 1; const lo = hero[0]?.v ?? 0; const hi = hero.at(-1)?.v ?? 0; const flat = hi - lo < 0.015; let seen = 0;
    const points = hero.map((x) => { const at = (100 * (seen + x.h.w / 2)) / total; seen += x.h.w; return `${at.toFixed(1)},${(flat ? 50 : 92 - (84 * (x.v - lo)) / (hi - lo)).toFixed(1)}`; });
    return { ...r, hero: hero.map((x) => x.h), line: LINES[r.lv], shown: kind, points: points.length > 1 ? points.join(' ') : points.length ? '0,50 100,50' : '', from: lo, to: hi };
  });
}
