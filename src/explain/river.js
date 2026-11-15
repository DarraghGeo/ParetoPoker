/**
 * NOT USED BY THE PAGE ANY MORE. `survey` still lays a river decision out for the charts; `explain`
 * is the earlier river wording, kept for reference. An audit against far finer solves found many of
 * its sentences absent or reshaped in them (research/proof/PROOF.md, "the river audit"): the page
 * now words rivers from proven claims only (street.js).
 *
 * Why a hand does what it does on the river.
 *
 * Takes one decision as a solver left it (each hand's strategy and what each action is worth to
 * it, the other range and its answers) and says what decides the hand's play: where it stands
 * against the line that separates one action from another, what happens to it next under each
 * action, and whether its cards set it apart from hands of the same strength.
 *
 * It is written the way a coach would say it across the table: about this hand, in the second
 * person, with the numbers that decide it. Every number is read from the solution (what an action
 * is worth, what he does next), counted from the two ranges (what the hand beats, what its cards
 * remove) or is the indifference maths (the price of a call, the folds a bluff needs).
 *
 * @typedef {Object} Decision
 * @property {'oop'|'ip'} seat
 * @property {number} pot Everything in the middle, his bet included.
 * @property {number} toCall
 * @property {{ kind: string, label: string, add: number }[]} actions
 * @property {{ id: any, name: string, cards?: number[], weight: number, strength: number, strategy: number[], values: number[]|null }[]} hands
 * @property {{ id: any, cards?: number[], weight: number, strength: number, answers: ({ fold: number, check: number, call: number, more: number }|null)[] }[]} villain
 */

export { MISTAKE } from './river/terms.js';
export { survey } from './river/survey.js';
export { explain } from './river/explain.js';
