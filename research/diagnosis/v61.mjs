// The river-worth order inside the selector: the whole engine's loss, fitted preset, with the
// worth ordering calls, value, or both on the turn.   node diagnosis/v61.mjs <set> [variants]
import { SETS, measure, format } from '../bin/compare.js';
import { NapkinSelector, presets } from '../src/index.js';
const [set, which] = process.argv.slice(2);
const variant = (options) => () => ({ ...presets.fitted(), selector: new NapkinSelector({ turnCalls: 'ehs2-ip', ...options }) });
const ROWS = { fitted: presets.fitted, call: variant({ worth: 'call' }), value: variant({ worth: 'value' }), both: variant({ worth: 'both' }), 'both, bet 0.33': variant({ worth: 'both', worthBet: 0.33 }) };
for (const name of (which ?? Object.keys(ROWS).join(',')).split(',')) console.log(`${set.padEnd(12)} worth: ${name.padEnd(16)} ${format(await measure(SETS[set], ROWS[name]))}`);
