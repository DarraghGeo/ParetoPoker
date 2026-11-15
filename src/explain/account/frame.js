import { blockedBy, facingOf } from '../../combos.js';

/** The decision's frame: the board as the solver stores it, both ranges as they arrive, and the scale of its values. */
export function frameAt(fs, solution, nodes, id, dealt = []) {
  const { spot, solver } = solution;
  const node = nodes[id];
  if (!node || node.kind !== 'decision') return null;
  const me = node.seat === 'oop' ? 0 : 1;
  const board = [...spot.board, ...dealt.slice(0, node.round)];
  if (board.length !== spot.board.length + node.round) return null;
  const { board: at, combos: stored } = spot.resolveBoard(board);
  const mineS = solution.reachAt(id, at, me);
  const hisS = solution.reachAt(id, at, 1 - me);
  const taken = new Uint8Array(52); for (const c of board) taken[c] = 1;
  const keep = (c) => !blockedBy(fs, c, taken);
  // both ranges by real combination
  const mine = fromStored(fs, stored, mineS, keep);
  const his = fromStored(fs, stored, hisS, keep);
  const mass = handsFacing(fs, his, keep);
  const live = liveOf(solver.ctx, node.round, at, me);
  return { fs, solution, solver, nodes, node, id, me, round: node.round, board, at, stored, mine, his, mineS, hisS, mass, live,
    scale: solver.ctx.runoutWeight[node.round], taken };
}

/** The combinations the solver deals a player on a board it stores. */
export const liveOf = (ctx, round, at, player) => {
  const slot = (ctx.active.roundBase[round] + at) * 2 + player;
  return ctx.active.list.subarray(ctx.active.start[slot], ctx.active.start[slot] + ctx.active.count[slot]);
};

/** A range on the stored board read back by real combination, for the combinations kept. */
export function fromStored(fs, stored, range, keep) {
  const out = new Float64Array(fs.COMBOS);
  for (let c = 0; c < fs.COMBOS; c++) if (keep(c)) out[c] = range[stored[c]];
  return out;
}

/** A range by real combination written onto the stored board, for the combinations kept. */
export function toStored(fs, stored, range, keep) {
  const out = new Float64Array(fs.COMBOS);
  for (let c = 0; c < fs.COMBOS; c++) if (keep(c)) out[stored[c]] = range[c];
  return out;
}

/** How much of his range each hand can face: all of it but what shares a card with it. */
function handsFacing(fs, his, keep) {
  const facing = facingOf(fs, his);
  const mass = new Float64Array(fs.COMBOS);
  for (let c = 0; c < fs.COMBOS; c++) if (keep(c)) mass[c] = facing(c);
  return mass;
}
