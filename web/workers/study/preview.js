// What two ranges look like in the editor before anything is solved: each one's equity curve (as given and as reshaped),
// the knobs on it, its numbers and how much of each chart cell it holds.
import * as fs from 'poker-flopsolve';
import { KNOBS, describe, reshape } from '../../../src/warp/reshape.js';
import { equities, held, weights } from './held.js';

const round3 = (x) => Math.round(x * 1000) / 1000;

/** A range as [weight, equity] pairs, weakest first. */
function curveOf(range, equity) {
  const list = [];
  for (let i = 0; i < fs.COMBOS; i++) if (range[i] > 1e-6 && !Number.isNaN(equity[i])) list.push([round3(range[i]), round3(equity[i])]);
  return list.sort((a, b) => a[1] - b[1]);
}

/** The equity at a share of the way along a curve. */
function equityAt(list, x) {
  const total = list.reduce((t, r) => t + r[0], 0); let seen = 0;
  for (const r of list) { seen += r[0] / total; if (seen >= x) return r[1]; }
  return list.length ? list[list.length - 1][1] : 0;
}

/** The chart cell a combination sits in, as "row,column". */
function cellOfCombo(i) {
  const a = fs.COMBO_CARDS[2 * i]; const b = fs.COMBO_CARDS[2 * i + 1];
  const ra = 12 - fs.rankOf(a); const rb = 12 - fs.rankOf(b); const hi = Math.min(ra, rb); const lo = Math.max(ra, rb);
  if (ra === rb) return `${hi},${hi}`;
  return fs.suitOf(a) === fs.suitOf(b) ? `${hi},${lo}` : `${lo},${hi}`;
}

/** How much of each cell's live combinations a range holds, to a hundredth. */
function cellsOf(range, board) {
  const sum = {}; const dead = new Set(board);
  for (let i = 0; i < fs.COMBOS; i++) {
    if (dead.has(fs.COMBO_CARDS[2 * i]) || dead.has(fs.COMBO_CARDS[2 * i + 1])) continue;
    const cell = (sum[cellOfCombo(i)] ??= [0, 0]); cell[0] += range[i]; cell[1] += 1;
  }
  const out = {}; for (const [key, [w, n]] of Object.entries(sum)) if (w > 0) out[key] = Math.round((100 * w) / n) / 100;
  return out;
}

/** The two ranges placed on the board (once for each pair of ranges: dragging a dial does not place them again). */
function placed(c) {
  const key = `${c.board}|${c.oop}|${c.ip}`;
  if (held.seen?.key === key) return held.seen;
  const board = fs.parseCards(c.board); const given = [weights(c.oop || 'AA:0'), weights(c.ip || 'AA:0')];
  held.seen = { key, board, given, placed: [equities(board, given[0], given[1]), equities(board, given[1], given[0])] };
  return held.seen;
}

export function preview(data) {
  try {
    const c = data.config; const { board, given, placed: base } = placed(c);
    const ranges = [reshape(given[0], base[0], c.dials?.oop), reshape(given[1], base[1], c.dials?.ip)];
    // before the river, placing every hand again on each move is too slow to follow a drag: hands keep the equity they had
    const after = board.length === 5 ? [equities(board, ranges[0], ranges[1]), equities(board, ranges[1], ranges[0])] : base;
    const side = (p) => { const start = curveOf(given[p], base[p]); return { curve: curveOf(ranges[p], after[p]), base: start, knobs: KNOBS.map((x) => equityAt(start, x)), stats: describe(ranges[p], after[p]), cells: cellsOf(ranges[p], board) }; };
    self.postMessage({ type: 'preview', id: data.id, sides: { oop: side(0), ip: side(1) } });
  } catch (error) { self.postMessage({ type: 'preview', id: data.id, error: String(error?.message ?? error) }); }
}
