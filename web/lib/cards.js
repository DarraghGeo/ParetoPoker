// Cards and hands as the pages show them: a card's rank, suit and glyph, and where a hand sits on the 13x13 chart.
export const RANKS = 'AKQJT98765432';
export const GLYPH = { s: '♠︎', h: '♥︎', d: '♦︎', c: '♣︎' };
/** The cards in a text ("As Kd", "AsKd"), each as rank and suit. */
export const cardList = (text) => (String(text ?? '').match(/[2-9TJQKA][shdc]/g) ?? []).map((c) => ({ rank: c[0], suit: c[1], glyph: GLYPH[c[1]] }));
export const pct = (x) => `${Math.round(100 * x)}`;

/** The chart cell a hand sits in, as "row,column": pairs on the diagonal, suited above it, offsuit below. */
export function cellOf(name) {
  const a = RANKS.indexOf(name[0]); const b = RANKS.indexOf(name[2]);
  const hi = Math.min(a, b); const lo = Math.max(a, b);
  if (a === b) return `${hi},${hi}`;
  return name[1] === name[3] ? `${hi},${lo}` : `${lo},${hi}`;
}
export const cellName = (i, j) => (i === j ? RANKS[i] + RANKS[i] : i < j ? `${RANKS[i]}${RANKS[j]}s` : `${RANKS[j]}${RANKS[i]}o`);
/** How many combinations a chart cell holds: six for a pair, four suited, twelve offsuit. */
export const cellSize = (i, j) => (i === j ? 6 : i < j ? 4 : 12);
/** The same for a cell by its key. */
export const sizeOf = (key) => { const [i, j] = key.split(',').map(Number); return cellSize(i, j); };

const place = (k) => k + 1 + (k > 4) + (k > 8);
/** The chart's 169 cells, row by row: each with its key, name, combinations and place in the grid (gaps after 5 and 9). */
export const CELLS = Array.from({ length: 169 }, (_, n) => {
  const i = Math.floor(n / 13); const j = n % 13;
  return { key: `${i},${j}`, i, j, name: cellName(i, j), size: cellSize(i, j), at: `grid-column:${place(j)};grid-row:${place(i)}` };
});

/** `n` cards dealt at random from what is left of the deck. */
export function randomCards(n, gone) {
  const deck = []; for (const suit of 'shdc') for (const rank of RANKS) if (!gone.has(rank + suit)) deck.push(rank + suit);
  const out = []; while (out.length < n && deck.length) out.push(deck.splice(Math.floor(Math.random() * deck.length), 1)[0]);
  return out;
}
