import { Mixer, NapkinSelector, Tuner, fittedMixer, fittedTuner, presets, valueChecks } from '../src/index.js';
const make = (tuner, mixer = fittedMixer()) => () => ({ selector: new NapkinSelector(), mixer, tuner });
export const variants = {
  napkin: presets.napkin,
  'empty tuner (frequencies always filled)': make(new Tuner([{ set: {} }]), valueChecks({ river: 0.2, turn: 0.4 })),
  'fitted, no river open rule': make(fittedTuner({ open: null })),
  'fitted, no river raise rule': make(fittedTuner({ raise: null })),
  'fitted, no river defence rule': make(fittedTuner({ defence: null })),
  'fitted tuner, old mixer': make(fittedTuner(), valueChecks({ river: 0.2, turn: 0.4 })),
};
