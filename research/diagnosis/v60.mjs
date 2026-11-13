// Orders of turn hands from one formula, tested the clean way: the solver's range, frequencies
// and mixing laid along the order (turn decisions only, the river left to the solver).
//   node diagnosis/v60.mjs <set> [bands]
import { SETS, measure, format } from '../bin/compare.js';
import { presets, riverWorth } from '../src/index.js';
const [set, bandsArg] = process.argv.slice(2);
const bands = (bandsArg ?? '20,50').split(',').map(Number);
/** A selector that orders every hand by one score: value from the top, bluffs from the bottom, calls from the top. */
const by = (score) => () => ({ selector: { value: (c) => score(c), call: (c) => score(c), bluff: (c) => score(c).map((x) => -x) } });
const worth = (bet) => by((c) => riverWorth({ equity: c.calculator, board: c.board, hero: c.hero, villain: c.villain, bet }));
const ROWS = [
  ['equity', by((c) => c.strength)],
  ['the fitted selector', presets.fitted],
  ['E[HS2]', by((c) => (c.board.length < 5 ? c.features.ehs2 : c.strength))],
  ['river worth, bet 0.33', worth(0.33)],
  ['river worth, bet 0.75', worth(0.75)],
  ['river worth, bet 1.5', worth(1.5)],
];
for (const n of bands) for (const [label, parts] of ROWS) {
  console.log(`${set.padEnd(12)} ${String(n).padStart(3)} bands  ${label.padEnd(24)} ${format(await measure(SETS[set], parts, { ranges: 'solver', hands: 'solver-by-order', orderBands: n, firstStreet: true, where: (d) => d.street === 'turn' }))}`);
}
