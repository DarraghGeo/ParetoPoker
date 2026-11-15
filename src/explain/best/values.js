// What each action is worth to each hand at a decision, and what the whole game is worth to a best-reply player.
import { faces, listsOf, perHand, tally } from './reach.js';
import { atFrame, walk } from './walk.js';

/**
 * What each action is worth to each hand at a decision: `values[a][combo]`, chips.
 * @param {{ mine: Float64Array, his: Float64Array, mass: Float64Array, board: number[], me: 0|1, node: object }} f A frame from account.js.
 */
export function valuesAt(g, f, mode) {
  const { heroes, villains } = listsOf(g, f);
  const reach = Float64Array.from(f.his);
  g.plan = null;
  return f.node.edges.map((edge) => perHand(g, f, heroes, walk(g, edge.child, atFrame(f, heroes, villains, reach, mode))));
}

/** The hands each player can hold at the start, on the spot's own board. */
function startLists(g, board, me, start) {
  const { A, B } = g;
  const used = new Uint8Array(52); for (const c of board) used[c] = 1;
  const heroes = []; const villains = [];
  for (let c = 0; c < g.N; c++) {
    if (used[A[c]] || used[B[c]]) continue;
    if (start[me][c] > 0) heroes.push(c);
    if (start[1 - me][c] > 0) villains.push(c);
  }
  return { heroes, villains };
}

/**
 * What the whole game is worth to a player who plays the best reply throughout, chips a hand,
 * given both starting ranges (`start[p]`: weights by combination). The two players' figures,
 * averaged, are the solution's exploitability: a check on this walk against the solver's own number.
 */
export function gameValue(g, me, start) {
  const board = [...g.spot.board];
  const { heroes, villains } = startLists(g, board, me, start);
  const reach = new Float64Array(g.N); for (const v of villains) reach[v] = start[1 - me][v];
  g.plan = null;
  const raw = walk(g, 0, { board, me, heroes, villains, reach, mode: 'best', ctx: {} });
  const t = tally(g, reach, villains);
  let total = 0, mass = 0;
  for (const h of heroes) { total += start[me][h] * raw[h]; mass += start[me][h] * faces(g, t, reach, h); }
  return total / mass;
}
