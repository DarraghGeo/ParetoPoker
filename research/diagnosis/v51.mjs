// The solver's range, frequencies and mixing, laid along a selector's order of hands.
import { SETS, measure, format } from '../bin/compare.js';
import { presets } from '../src/index.js';
const sets = process.argv.slice(2);
for (const set of sets) {
  for (const [name, parts] of [['fitted (Napkin) order', presets.fitted], ['equity order', presets.equity]]) {
    for (const orderBands of [10, 20, 50]) {
      console.log(`${set.padEnd(12)} ${name.padEnd(22)} ${String(orderBands).padStart(3)} bands  ${format(await measure(SETS[set], parts, { ranges: 'solver', hands: 'solver-by-order', orderBands, where: () => true }))}`);
    }
  }
  console.log(`${set.padEnd(12)} ${'the solver itself'.padEnd(22)}            ${format(await measure(SETS[set], presets.fitted, { ranges: 'solver', frequencies: 'solver', hands: 'solver-mixed', where: () => true }))}`);
  console.log(`${set.padEnd(12)} ${'whole engine, fitted'.padEnd(22)}            ${format(await measure(SETS[set], presets.fitted))}`);
}
