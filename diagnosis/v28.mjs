import { KindMixer, TURN_KINDS, fittedMixer, presets } from '../src/index.js';
export const variants = {
  fitted: presets.fitted,
  'turn table also on the flop': () => ({ ...presets.fitted(), mixer: new KindMixer({ tables: { ...TURN_KINDS, flop: TURN_KINDS.turn }, rules: fittedMixer().rules }) }),
  'turn table on the flop, out of position only': () => ({ ...presets.fitted(), mixer: new KindMixer({ tables: { ...TURN_KINDS, flop: { oop: TURN_KINDS.turn.oop } }, rules: fittedMixer().rules }) }),
};
