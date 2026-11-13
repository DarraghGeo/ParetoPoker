// The river profile from the curve game (src/CurveGame.js) in the engine, against the fitted
// preset: loss to the solver's best response.   node diagnosis/v63.mjs <set> [n spots] [rows]
import { SETS, measure, format } from '../bin/compare.js';
import { ProfileStrategist, derivedTuner, fittedTuner, presets } from '../src/index.js';
const [set, limit, rows] = process.argv.slice(2);
const spots = limit && limit !== 'all' ? SETS[set].filter((_, i) => i % Math.ceil(SETS[set].length / Number(limit)) === 0) : SETS[set];
const profile = (extra = {}) => () => ({ ...presets.fitted(), strategist: ProfileStrategist, ...extra });
const ROWS = [
  ['fitted preset', presets.fitted, {}],
  ['fitted with the derived defence', () => ({ ...presets.fitted(), tuner: derivedTuner({ rules: fittedTuner().rules, frequency: false, fold: 'prior' }) }), {}],
  ['curve profile, his range given', profile(), { ranges: 'solver', where: () => true }],
  ['curve profile, whole engine', profile(), {}],
  ['curve profile, whole engine, 1000 iterations', profile({ iterations: 1000 }), {}],
  ['two-street curve profile, whole engine', profile({ turn: true }), {}],
  ['two-street curve profile, 600 iterations', profile({ turn: true, turnIterations: 600 }), {}],
];
for (const i of (rows ?? '0,1,2,3').split(',').map(Number)) { const t = Date.now(); console.log(`${set.padEnd(12)} ${ROWS[i][0].padEnd(46)} ${format(await measure(spots, ROWS[i][1], ROWS[i][2]))}  ${((Date.now() - t) / 1000).toFixed(0)}s`); }
