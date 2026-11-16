// Reading a street the table holds, whichever kind it is: a flop made slim (solver/slim.js), or a turn or river solved
// again here and kept whole (they are small). A decision's strategy, both ranges at it, and what hero's actions are worth.
import * as fs from 'poker-flopsolve';
import { actionValues, frameAt } from '../../../src/explain/account.js';
import { onBoard } from '../../solver/deck.js';

const boardAt = (seg, node) => [...seg.solved.cards, ...seg.dealt].slice(0, seg.solved.cards.length + node.round);

/** A decision's strategy: `probs[at(combination) * n + action]`, `at` giving -1 for a hand that is not held there. */
export function strategyOf(seg, node) {
  const s = seg.solved;
  if (s.slim) { const d = s.at[node.id]; return { n: d.n, probs: d.probs, at: (combo) => d.index[combo] }; }
  const found = s.spot.resolveBoard(boardAt(seg, node)); const view = s.solution.strategyAt(node.id, found.board);
  return { n: view.actions.length, probs: view.probs, at: (combo) => view.combos.indexOf(found.combos[combo]) };
}

/** Both ranges at a decision, by real combination: `[out of position's, in position's]`. */
export function rangesOf(seg, node) {
  const s = seg.solved; if (s.slim) return s.at[node.id].reach;
  const board = boardAt(seg, node); const found = s.spot.resolveBoard(board);
  return [0, 1].map((who) => onBoard(s.solution.reachAt(node.id, found.board, who), found, board));
}

/** What each action at hero's decision is worth to his hand, in chips, by the solution's own values; null where it has none. */
export function worthOf(seg, node, combo) {
  const s = seg.solved; if (s.slim) return s.mine[node.id]?.worth ?? null;
  try {
    const worth = actionValues(frameAt(fs, s.solution, s.nodes, node.id, seg.dealt)).map((v) => v[combo]);
    return worth.some((x) => Number.isNaN(x)) ? null : worth;
  } catch { return null; }
}
