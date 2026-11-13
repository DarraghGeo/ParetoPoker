// Turn trees: the solver's range, frequencies and mixing, laid along a selector's order of hands.
//   node diagnosis/v52.mjs <set> [full]
import { SETS, measure, format } from '../bin/compare.js';
import { presets } from '../src/index.js';
const [set, full] = process.argv.slice(2);
const run = async (label, parts, options) => console.log(`${set.padEnd(12)} ${label.padEnd(44)} ${format(await measure(SETS[set], parts, options))}`);
const along = (orderBands, where = () => true) => ({ ranges: 'solver', hands: 'solver-by-order', orderBands, where });
await run('fitted order, 20 bands', presets.fitted, along(20));
await run('equity order, 20 bands', presets.equity, along(20));
if (full) {
  await run('fitted order, 10 bands', presets.fitted, along(10));
  await run('fitted order, 50 bands', presets.fitted, along(50));
  await run('fitted order, 20 bands, turn decisions only', presets.fitted, along(20, (d) => d.street === 'turn'));
  await run('fitted order, 20 bands, river decisions only', presets.fitted, along(20, (d) => d.street === 'river'));
  await run('the solver itself', presets.fitted, { ranges: 'solver', frequencies: 'solver', hands: 'solver-mixed', where: () => true });
}
