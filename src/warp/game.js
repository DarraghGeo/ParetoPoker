import { buildTree, levelsFromCurve, solveCurves } from './curves.js';
import { warpDecision } from './game/decision.js';
import { plainTree } from './game/plain-tree.js';
import { profilesOf } from './game/reach.js';

/**
 * A drawn curve as a solved game the explainer can read: the tree in the same shape as a
 * solver's (`nodes`), and `decisionAt(id)` giving every level's strategy at a decision.
 *
 * @param {Object} input
 * @param {number[]} input.equities The out-of-position player's equity curve, weakest card first.
 * @param {number} input.pot
 * @param {number} input.stack
 * @param {number[]} input.bets Bet sizes in pots.
 * @param {number} input.raise A raise as a multiple of the bet faced (0: no raises).
 * @param {number} [input.iterations]
 */
export function warpGame({ equities, pot, stack, bets, raise, iterations = 300 }) {
  const levels = levelsFromCurve(equities);
  const tree = buildTree({ pot, stack, menu: { bet: bets, raise }, maxRaises: raise > 0 ? 3 : 0 });
  const solved = solveCurves({ first: levels.first, second: levels.second, tree, iterations });
  const nodes = plainTree(tree.root, pot, stack);
  const game = { nodes, levels, start: [levels.first, levels.second], profileAt: profilesOf(nodes, solved) };
  return {
    nodes,
    levels,
    /** The decision at a node in the explainer's shape: hands are strength levels, with no cards. */
    decisionAt(id) {
      return warpDecision(game, id);
    },
  };
}
