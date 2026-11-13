#!/usr/bin/env node
// Where does the engine lose? Hands each of its jobs to the solver in turn and measures the rest.
//   his range     the engine's own model of the opponent's range, or the solver's range for him
//   frequencies   the engine's (how often each action, and which sizes), or the solver's
//   hands         the selector's choice, the solver's order dealt all-or-nothing as a selector's
//                 is ("solver, pure"), or the solver's hands with its own mixing ("solver")
//   node bin/decompose.js [--set rivers|rivers-b|turns|turns-b|flop] [--selector napkin|equity]
import { parseArgs } from 'node:util';
import { SELECTORS, SETS, measure } from './compare.js';

const { values: args } = parseArgs({ options: { set: { type: 'string', default: 'rivers' }, selector: { type: 'string', default: 'napkin' } } });
const rows = [
  ['the engine as it is', 'engine', 'engine', 'engine'],
  ['given his range', 'solver', 'engine', 'engine'],
  ['given the frequencies', 'engine', 'solver', 'engine'],
  ['given both: hand selection alone', 'solver', 'solver', 'engine'],
  ['given the hands, in order', 'engine', 'engine', 'solver'],
  ['given the hands, with mixing', 'engine', 'engine', 'solver-mixed'],
  ['given his range and the hands', 'solver', 'engine', 'solver-mixed'],
  ['the solver, dealt all-or-nothing', 'solver', 'solver', 'solver'],
  ['the solver', 'solver', 'solver', 'solver-mixed'],
];
const name = { engine: 'engine', solver: 'solver', 'solver-mixed': 'solver' };
console.log(`${args.set}, ${args.selector} selector: loss as a share of the pot to the solver's best response (to its equilibrium in brackets)`);
console.log(`  ${''.padEnd(34)} ${'his range'.padEnd(10)} ${'frequencies'.padEnd(12)} ${'hands'.padEnd(13)} ${'out of pos.'.padStart(14)} ${'in position'.padStart(14)} ${'both'.padStart(14)}`);
const results = {};
for (const [label, ranges, frequencies, hands] of rows) {
  const r = await measure(SETS[args.set], SELECTORS[args.selector], { ranges, frequencies, hands, where: () => true });
  const cell = ([g, x]) => `${(100 * x).toFixed(1).padStart(5)} (${(100 * g).toFixed(1)})`.padStart(14);
  const both = [(r.oop[0] + r.ip[0]) / 2, (r.oop[1] + r.ip[1]) / 2];
  results[label] = both[1];
  console.log(`  ${label.padEnd(34)} ${name[ranges].padEnd(10)} ${name[frequencies].padEnd(12)} ${(hands === 'solver' ? 'solver, pure' : name[hands]).padEnd(13)} ${cell(r.oop)} ${cell(r.ip)} ${cell(both)}`);
}
const points = (x) => `${(100 * x).toFixed(1)} points`;
const engine = results['the engine as it is'];
console.log(`\n  Starting from the engine (${points(engine)}), handing one job to the solver changes the loss by:`);
console.log(`    his range        ${points(results['given his range'] - engine)}`);
console.log(`    frequencies      ${points(results['given the frequencies'] - engine)}`);
console.log(`    hands, in order  ${points(results['given the hands, in order'] - engine)}`);
console.log(`    hands, mixed     ${points(results['given the hands, with mixing'] - engine)}`);
console.log(`  Starting from the solver (${points(results['the solver'])}), taking one job back costs:`);
console.log(`    dealing all-or-nothing in the solver's order   ${points(results['the solver, dealt all-or-nothing'] - results['the solver'])}`);
console.log(`    the selector's hands (his range and frequencies given)   ${points(results['given both: hand selection alone'] - results['the solver'])}`);
console.log(`    the engine's frequencies (his range and hands given)     ${points(results['given his range and the hands'] - results['the solver'])}`);
