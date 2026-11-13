// The derived river defence inside the fitted preset, on turn trees (where the river is reached
// after a turn): the fitted preset as it is, and with the derived defence from the range before
// the bet or from the betting range.   node diagnosis/v62.mjs <set>
import { SETS, measure, format } from '../bin/compare.js';
import { derivedTuner, fittedTuner, presets } from '../src/index.js';
const [set] = process.argv.slice(2);
const withDefence = (fold) => () => ({ ...presets.fitted(), tuner: derivedTuner({ rules: fittedTuner().rules, frequency: false, fold }) });
for (const [label, parts] of [['fitted tuner', () => ({ ...presets.fitted(), tuner: fittedTuner() })], ['with derived river defence (range before the bet)', withDefence('prior')], ['with derived river defence (betting range)', withDefence('range')]]) {
  console.log(`${set.padEnd(12)} ${label.padEnd(52)} ${format(await measure(SETS[set], parts))}`);
}
