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
