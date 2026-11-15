// What every walk of one solved game reads: the tree, the solution, each combination's two cards as typed arrays, the
// pot the spot started with, and the hero's later choices when a walk is asked to keep or to follow them.
import { firstCard, secondCard } from '../../combos.js';

export function walkerOf(fs, solution, nodes) {
  const N = fs.COMBOS;
  const A = new Uint8Array(N); const B = new Uint8Array(N);
  for (let c = 0; c < N; c++) { A[c] = firstCard(fs, c); B[c] = secondCard(fs, c); }
  return { fs, solution, nodes, spot: solution.spot, N, A, B, pot0: nodes[0].pot, plan: null };
}

/** A player's strategy at a node on a real board: `probs[rowOf(combo) * n + k]` for each hand held. */
export function strategyAt(g, id, board) {
  const found = g.spot.resolveBoard(board);
  const view = g.solution.strategyAt(id, found.board);
  const row = new Int32Array(g.N).fill(-1);
  view.combos.forEach((c, i) => { row[c] = i; });
  return { n: view.actions.length, probs: view.probs, rowOf: (c) => row[found.combos[c]] };
}

/** The cards still to come on a board, in order. */
export function unseen(board) {
  const used = new Uint8Array(52); for (const c of board) used[c] = 1;
  const cards = [];
  for (let x = 0; x < 52; x++) if (!used[x]) cards.push(x);
  return cards;
}

/** The hands left once card `x` comes, and his reach on them. */
export function dealtCard(g, heroes, villains, reach, x) {
  const { A, B } = g;
  const hs = heroes.filter((h) => A[h] !== x && B[h] !== x); const vs = villains.filter((v) => A[v] !== x && B[v] !== x);
  const next = new Float64Array(g.N); for (const v of vs) next[v] = reach[v];
  return { hs, vs, next };
}
