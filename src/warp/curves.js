/**
 * Warp: the river as a game between two strength curves that you draw.
 *
 * Every card of both players sits on one axis, its strength; a range is a curve of how much of
 * it sits at each level. A card beats the levels below it and loses to those above, so one
 * player's equity curve fixes the other's. The game (any bets and raises, the stacks) is solved
 * by iteration (CFR+) in a few milliseconds. No real cards: nothing is removed from his range
 * by what you hold.
 */

export { buildTree } from './curves/tree.js';
export { solveCurves } from './curves/solve.js';
export { levelsFromCurve } from './curves/levels.js';
