// What Study's worker holds: the solve on screen and its tree, the run the next solve can start from, the solves kept by
// version (so going back to one is immediate), the decisions studied in the solve on screen, and a solve handed over.
import * as fs from 'poker-flopsolve';
import { equityVs } from '../../../src/solver/flopsolve.js';
import { solverBetting } from '../../solver/betting.js';

/** The memory the kept solves may take; the oldest are dropped past it. */
const ROOM = 420 * 2 ** 20;
export const held = { solution: null, nodes: null, current: null, last: null, job: 0, halt: false, adopted: null, seen: null, kept: new Map(), studies: new Map() };

/** Keep a solve under its version's key, dropping the oldest others while the kept ones take too much memory. */
export function keep(key, entry) {
  held.kept.delete(key); held.kept.set(key, entry);
  let total = 0; for (const e of held.kept.values()) total += e.bytes;
  for (const [k, e] of held.kept) { if (total <= ROOM || k === key) continue; held.kept.delete(k); total -= e.bytes; }
}

/** Put a solve on screen. */
export function use(entry) {
  Object.assign(held, { solution: entry.solution, nodes: entry.nodes, current: entry });
  if (entry.run) held.last = { board: entry.board, run: entry.run, lite: entry.lite };
  held.studies.clear();
}

export const say = (message, transfer = []) => self.postMessage(message, transfer);
export const firstLine = (error) => String(error?.message ?? error).split('\n')[0];
export const tree = () => held.nodes.map(({ id, kind, round, seat, pot, edges, parent, via, invested }) => ({ id, kind, round, seat, pot, edges, parent, via, invested }));
export const equities = (board, mine, his) => equityVs(fs, board, mine, his);
export const weights = (range) => (typeof range === 'string' ? fs.parseRange(range) : Float64Array.from(range));
export const dealtOf = (data) => fs.parseCards((data.dealt ?? []).join(' '));
export const streetName = (board) => ['flop', 'turn', 'river'][board.length - 3];
/** The spot as the solver takes it. */
export const spotOf = (c, oop, ip) => ({ board: c.board, pot: c.pot, stack: c.stack, oop, ip, ...solverBetting(c) });
