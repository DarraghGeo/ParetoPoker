// What would change what a range does at a decision. Not argued: the street is played again with one thing changed, and
// solved. His strongest hands (the top 20% by equity) out of his range; ours out of ours; no raise for him on this
// street; no bet for him when checked to. The same street solved again unchanged is what each is set beside.
import { study, sayChanges, firstOrder } from './street.js';
import { withoutHisRaise, withoutHisStab, withoutStrongest } from './whatif/changes.js';
import { answer } from './whatif/answer.js';
import { streetOf } from './whatif/street.js';

/** Where the street cannot be played again: what the solution itself says would change it. */
function readFromSolution(fs, solution, nodes, id, dealt) {
  let st; try { st = study(fs, solution, nodes, id, dealt); } catch { return null; }
  const r = st ? firstOrder(st) : null;
  return r ? { skipped: 'large', facing: r.facing, read: r, said: r.said } : { skipped: 'large' };
}

/** How the decision is played again: whose it is, whether it faces a bet, and how long each solve may take. */
function playOf(nodes, id, { path, board }, limits) {
  const me = nodes[id].seat === 'ip' || nodes[id].seat === 1 ? 1 : 0;
  const facing = nodes[id].invested[1 - me] > nodes[id].invested[me];
  const target = board.length === 5 ? 0.05 : board.length === 4 ? 0.15 : 0.4;
  return { path, board, me, facing, first: path.length === 0, target, budget: limits.ms ?? (board.length === 3 ? 20000 : 7000) };
}

/** Facing a bet: how close the call is, from the solution itself. */
function closeness(fs, solution, nodes, id, dealt, out) {
  try { const fo = firstOrder(study(fs, solution, nodes, id, dealt)); if (fo) out.close = fo.close; } catch { /* said without it */ }
}

function playedAgain(fs, game, id, dealt, street, play) {
  const out = { facing: play.facing, street: ['flop', 'turn', 'river'][street.board.length - 3] }; const t0 = Date.now();
  out.base = answer(fs, play, street.base); if (out.base == null) return null;
  withoutStrongest(fs, street, play, out);
  withoutHisRaise(fs, street, play, out);
  withoutHisStab(fs, street, play, out);
  if (play.facing) closeness(fs, game.solution, game.nodes, id, dealt, out);
  out.ms = Date.now() - t0; out.said = sayChanges(out);
  return out;
}

/** The street the decision is on, played again with one thing changed at a time. Null where that is too large to do here. */
export function whatIf(fs, game, id, dealt, limits = {}) {
  const { solution, nodes, config } = game;
  if (!config) return null;
  const street = streetOf(fs, solution, nodes, id, dealt, config);
  let probe; try { probe = fs.defineSpot(street.base); } catch { return null; }
  if (probe.estimate.bytes > (limits.bytes ?? 160 * 2 ** 20)) return readFromSolution(fs, solution, nodes, id, dealt);
  return playedAgain(fs, game, id, dealt, street, playOf(nodes, id, street, limits));
}
