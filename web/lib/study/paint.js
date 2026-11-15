// Ranges painted on the chart or typed: how much of each cell a range's notation holds, and the notation for cells painted.
import { RangeManager } from 'poker-rangeman';
import { cellName, cellOf, sizeOf } from '../cards.js';

/** How much of each chart cell a range holds, 0 to 1 (a hand held in part counts for its part); null when it cannot be read. */
export function cellsOf(notation) {
  const cells = new Map();
  if (!notation.trim()) return cells;
  try {
    const range = new RangeManager(notation);
    for (const hand of range.getHands()) cells.set(cellOf(hand), (cells.get(cellOf(hand)) ?? 0) + (range.weightOf?.(hand) ?? 1));
  } catch { return null; }
  for (const [key, n] of cells) cells.set(key, n / sizeOf(key));
  return cells;
}

/** The notation for a set of whole cells, as compact as rangeman writes it. */
export function notationOf(keys) {
  const names = [...keys].map((key) => { const [i, j] = key.split(',').map(Number); return cellName(i, j); });
  if (!names.length) return '';
  try { return new RangeManager(names.join(',')).toNotation(); } catch { return names.join(','); }
}

/** The notation once a stroke has painted its cells in or out. */
export function paintedNotation(cells, { add, keys }) {
  const out = new Map(cells); for (const key of keys) { if (add) out.set(key, 1); else out.delete(key); }
  return notationOf([...out.entries()].filter(([, share]) => share > 0).map(([key]) => key));
}

/** How many combinations the cells hold. */
export const comboCount = (cells) => Math.round([...cells].reduce((t, [key, share]) => t + share * sizeOf(key), 0));
