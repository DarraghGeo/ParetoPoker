import { readFileSync } from 'node:fs';
import { KindMixer, fittedMixer, presets } from '../src/index.js';
const tables = JSON.parse(readFileSync(new URL('./turn-kinds-48.json', import.meta.url)));
export const variants = {
  fitted: presets.fitted,
  'kind table from 48 decisions': () => ({ ...presets.fitted(), mixer: new KindMixer({ tables: { ...tables, flop: tables.turn }, rules: fittedMixer().rules }) }),
};
