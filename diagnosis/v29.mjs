import { KindMixer, TURN_KINDS, fittedMixer, presets } from '../src/index.js';
export const variants = {
  napkin: presets.napkin,
  fitted: presets.fitted,
  'fitted + turn table on the flop': () => ({ ...presets.fitted(), mixer: new KindMixer({ tables: { ...TURN_KINDS, flop: TURN_KINDS.turn }, rules: fittedMixer().rules }) }),
};
