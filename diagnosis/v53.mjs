// Each of the engine's choices on its own: the solver's range for him throughout, and the solver
// doing every job but the one named.
//   node diagnosis/v53.mjs <set> [streets]
import { SETS, measure, format } from '../bin/compare.js';
import { presets, PureMixer } from '../src/index.js';
const [set, streets] = process.argv.slice(2);
const all = () => true;
const run = async (label, parts, options) => console.log(`${set.padEnd(12)} ${label.padEnd(58)} ${format(await measure(SETS[set], parts, { ranges: 'solver', where: all, ...options }))}`);
const pure = () => ({ ...presets.fitted(), mixer: new PureMixer() });
const theirs = { frequencies: 'solver' };

await run('the solver itself', presets.fitted, { ...theirs, hands: 'solver-mixed' });
await run('everything ours (his range given)', presets.fitted, {});
// Frequency: ours; the hands and the mixing are the solver's, scaled to our frequencies
await run('FREQUENCY ours (fitted)', presets.fitted, { hands: 'solver-mixed' });
await run('FREQUENCY ours (fundamentals, no tuning)', presets.equity, { hands: 'solver-mixed' });
if (streets) {
  await run('FREQUENCY ours (fitted), turn decisions only', presets.fitted, { hands: 'solver-mixed', where: (d) => d.street === 'turn' });
  await run('FREQUENCY ours (fitted), river decisions only', presets.fitted, { hands: 'solver-mixed', where: (d) => d.street === 'river' });
}
// Mixing: the solver's frequencies throughout
await run('MIXING none, the solver\'s order', presets.fitted, { ...theirs, hands: 'solver' });
await run('MIXING the solver\'s, our order (20 bands)', presets.fitted, { hands: 'solver-by-order', orderBands: 20 });
await run('MIXING none, our order', pure, theirs);
await run('MIXING ours (caps), our order', presets.fitted, theirs);
await run('MIXING ours (caps and kind tables), our order', presets.fitted, { ...theirs, kinds: true });
if (streets) {
  await run('MIXING ours (caps and kinds), turn decisions only', presets.fitted, { ...theirs, kinds: true, where: (d) => d.street === 'turn' });
  await run('MIXING none, our order, turn decisions only', pure, { ...theirs, where: (d) => d.street === 'turn' });
}
