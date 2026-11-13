import { readFileSync } from 'node:fs';
import { KindMixer, TURN_KINDS, fittedMixer, presets } from '../src/index.js';
const load = (n) => JSON.parse(readFileSync(new URL(`./turn-kinds-${n}.json`, import.meta.url)));
const make = (tables) => () => ({ ...presets.fitted(), mixer: new KindMixer({ tables: { ...tables, flop: tables.turn }, rules: fittedMixer().rules }) });
export const variants = {
  fitted: presets.fitted,
  '10 bands x draw, each kind a line in the level': make(load(10)),
  '20 bands x draw, each kind a line in the level': make(load(20)),
  '5 bands x draw, each kind a line in the level': make(load(6)),
};
