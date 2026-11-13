import { NapkinSelector, fittedMixer, fittedTuner, presets } from '../src/index.js';
const make = (tuner) => () => ({ selector: new NapkinSelector(), mixer: fittedMixer(), tuner });
const oop = (o) => ({ open: { river: { oop: o, ip: { size: 0.75, valueThreshold: 0.6 } } } });
export const variants = {
  napkin: presets.napkin,
  'oop rule always': make(fittedTuner(oop({ size: 0.75, valueThreshold: 0.6 }))),
  'oop rule never': make(fittedTuner(oop(null))),
  'oop rule when ahead by 0.03': presets.fitted,
  'oop rule when ahead by 0.1': make(fittedTuner(oop({ size: 0.75, valueThreshold: 0.6, ahead: 0.1 }))),
  'oop rule when ahead by -0.03': make(fittedTuner(oop({ size: 0.75, valueThreshold: 0.6, ahead: -0.03 }))),
};
