// The street a decision is on, as a spot of its own: its first decision, the actions from there to the decision, both
// ranges as they arrive on the real board, and the settings to solve it again with.
import { blockedBy } from '../../combos.js';

/** The first decision of the street, and the actions from it to decision `id`. */
function streetRoot(nodes, id) {
  let root = id; const path = [];
  while (nodes[root].parent >= 0 && nodes[nodes[root].parent].kind !== 'chance') {
    const parent = nodes[nodes[root].parent];
    path.unshift(parent.edges[nodes[root].via].label);
    root = parent.id;
  }
  return { root, path };
}

/** A range as the solver stores it, on the real board's combinations (those holding a board card left out). */
function realRange(fs, taken, found, stored) {
  const range = new Float64Array(fs.COMBOS);
  for (let k = 0; k < fs.COMBOS; k++) if (!blockedBy(fs, k, taken)) range[k] = stored[found.combos[k]];
  return range;
}

/** The bet sizes of the streets left. */
function betsLeft(bets, streets) {
  if (!Array.isArray(bets[0])) return [bets];
  return bets.length > 1 ? bets.slice(-streets) : bets;
}

function settingsOf(fs, c, board, streets, sub, ranges) {
  const bets = betsLeft(c.bets, streets);
  const most = 1 + (c.raises.length ? c.maxRaises : 0);
  const raiseSizes = c.raises.length ? c.raises.map((times) => ({ times })) : undefined;
  const base = {
    board: fs.formatCards(board).replace(/ /g, ''), pot: sub.pot, stack: sub.stack, oop: ranges[0], ip: ranges[1],
    betSizes: bets, raiseSizes, maxRaises: most, allowAllIn: !!c.allIn,
  };
  return { bets, most, base };
}

/** @param {{ bets: number[]|number[][], raises: number[], maxRaises: number, allIn: boolean }} c The spot's settings. */
export function streetOf(fs, solution, nodes, id, dealt, c) {
  const { spot } = solution;
  const { root, path } = streetRoot(nodes, id);
  const board = [...spot.board, ...dealt.slice(0, nodes[root].round)];
  const found = spot.resolveBoard(board);
  const sub = solution.subgameAt(root, found.board, {});
  const taken = new Set(board);
  const rangeOf = (p) => realRange(fs, taken, found, solution.reachAt(root, found.board, p));
  const ranges = [rangeOf(0), rangeOf(1)];
  const streets = 6 - board.length;
  return { path, board, ranges, streets, ...settingsOf(fs, c, board, streets, sub, ranges) };
}
