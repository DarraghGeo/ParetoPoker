import { readFileSync } from 'node:fs';
import { KindMixer, fittedMixer, presets } from '../src/index.js';
const facing = JSON.parse(readFileSync(new URL('./turn-facing-kinds-ehs2.json', import.meta.url)));
const make = (f) => () => { const base = presets.fitted(); return { ...base, mixer: new KindMixer({ tables: { ...base.mixer.tables, facing: f }, rules: fittedMixer().rules }) }; };
export const variants = {
  fitted: presets.fitted,
  'facing a turn bet by kind (20 bands of E[HS^2] x draw)': make(facing),
  'the same, in position only': make({ turn: { ip: facing.turn.ip } }),
  'the same, out of position only': make({ turn: { oop: facing.turn.oop } }),
};
