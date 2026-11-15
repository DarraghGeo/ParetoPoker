/**
 * A flop, turn or river decision, measured and explained: everything an explanation of one hand may quote, computed
 * once for the decision and read per hand, and the words for the hand and for the range.
 *
 * `study` gathers the decision; `measure` reads one hand off it. The same two calls serve the page (which words what
 * passes its gates) and the proof harness (which measures the same hand in a far finer solve and checks each worded claim
 * against it). All values are in % of the pot at this decision. The parts live in ./street/.
 */
export { study, ON_PATH } from './street/study.js';
export { NEAR } from './street/fifths.js';
export { measure } from './street/measure.js';
export { TOLERANCE, ON_TRIAL, tolerance } from './street/tolerance.js';
export { claims, holds, RARE, TAKES } from './street/claims.js';
export { describe } from './street/hand-words.js';
export { groupsOf } from './street/groups.js';
export { nextStreet, nextBarrel } from './street/next-street.js';
export { oneMove } from './street/one-move.js';
export { explainStreet } from './street/hand/explain.js';
export { twins, worthAround } from './street/twins.js';
export { analysis } from './street/analysis.js';
export { rangeMoves } from './street/range/moves.js';
export { explainRange } from './street/range/explain.js';
export { firstOrder } from './street/range/first-order.js';
export { sayChanges } from './street/range/changes.js';
