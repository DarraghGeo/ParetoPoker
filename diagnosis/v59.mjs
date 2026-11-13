// The derived river tuner (src/Tuner.js, derivedTuner) against no tuning and the fitted tuner:
// loss to the best response on the river sets. Same hand selector and mixer throughout.
import { SETS, measure, format } from '../bin/compare.js';
import { NapkinSelector, NoTuner, derivedTuner, fittedMixer, fittedTuner, sizeNear, Tuner } from '../src/index.js';
const sets = process.argv.slice(2);
const parts = (tuner) => () => ({ selector: new NapkinSelector({ turnCalls: 'ehs2-ip' }), mixer: fittedMixer(), tuner: tuner() });
const ROWS = [
  ['no tuning (the fundamentals)', () => new NoTuner()],
  ['no tuning, one size near 75%', () => new Tuner([{ when: (c) => c.street === 'river' && !c.facing, set: { sizing: sizeNear(0.75) } }])],
  ['fitted tuner', () => fittedTuner()],
  ['derived: defence only (from the betting range)', () => derivedTuner({ frequency: false })],
  ['derived: defence only (from the range before the bet)', () => derivedTuner({ frequency: false, fold: 'prior' })],
  ['derived: bet frequency only', () => derivedTuner({ defence: false })],
  ['derived: bet frequency only, he cannot raise', () => derivedTuner({ defence: false, raiseMultiple: 0 })],
  ['derived: both', () => derivedTuner({ fold: 'prior' })],
  ['fitted, with the derived defence in its place', () => derivedTuner({ rules: fittedTuner().rules, frequency: false, fold: 'prior' })],
];
const only = process.env.ROWS ? process.env.ROWS.split(',').map(Number) : null;
for (const set of sets) for (const [label, tuner] of ROWS.filter((_, i) => !only || only.includes(i))) console.log(`${set.padEnd(12)} ${label.padEnd(56)} ${format(await measure(SETS[set], parts(tuner)))}`);
