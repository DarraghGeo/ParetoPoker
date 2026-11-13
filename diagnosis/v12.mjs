import { NapkinSelector, fittedMixer, fittedTuner, presets, valueChecks } from '../src/index.js';
const make = (tuner, mixer = fittedMixer()) => () => ({ selector: new NapkinSelector(), mixer, tuner });
const open = (oop, ip) => ({ open: { river: { oop, ip } } });
export const variants = {
  napkin: presets.napkin,
  fitted: presets.fitted,
  'no open rule': make(fittedTuner({ open: null })),
  'open: threshold only': make(fittedTuner(open({ valueThreshold: 0.6 }, { valueThreshold: 0.6 }))),
  'open: size only': make(fittedTuner(open({ size: 0.75, valueThreshold: 0.7 }, { size: 0.75, valueThreshold: 0.7 }))),
  'open: oop only': make(fittedTuner(open({ size: 0.75, valueThreshold: 0.6 }, {}))),
  'open: ip only': make(fittedTuner(open({}, { size: 0.75, valueThreshold: 0.6 }))),
  'old mixer (flat checks)': make(fittedTuner(), valueChecks({ river: 0.2, turn: 0.4 })),
  'no defence / raise rules': make(fittedTuner({ defence: null, raise: null })),
  'no raise rule': make(fittedTuner({ raise: null })),
  'no defence rule': make(fittedTuner({ defence: null })),
};
