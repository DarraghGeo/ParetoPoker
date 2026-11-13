import { NapkinSelector, Tuner, fittedMixer, fittedTuner, presets, valueChecks } from '../src/index.js';
export const variants = {
  napkin: presets.napkin,
  'empty tuner': () => ({ selector: new NapkinSelector(), mixer: valueChecks({ river: 0.2, turn: 0.4 }), tuner: new Tuner([{ set: {} }]) }),
  fitted: presets.fitted,
};
