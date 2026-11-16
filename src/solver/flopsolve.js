// Reads a spot solved by poker-flopsolve into the plain shape the explainer takes. The solver module is passed in (`fs`),
// so the same code runs in Node and in a browser worker. A spot may start on the flop, the turn or the river; past a deal,
// a decision is read on the cards that were dealt.
export { treeOf } from './tree.js';
export { bothEquities, equityVs } from './equity.js';
export { decisionAt } from './decision.js';
