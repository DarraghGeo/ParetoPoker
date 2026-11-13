import { NapkinSelector, fittedMixer, fittedTuner, presets } from '../src/index.js';
const make = (open) => () => ({ selector: new NapkinSelector({ turnCalls: 'ehs2-ip' }), mixer: fittedMixer(), tuner: fittedTuner({ open: { river: open } }) });
const oop = { size: 0.75, valueThreshold: 0.6, ahead: 0.03 };
export const variants = {
  fitted: presets.fitted,
  'no ip river open rule': make({ oop }),
  'ip river: threshold 0.6 only': make({ oop, ip: { valueThreshold: 0.6 } }),
  'ip river: size 0.75 only': make({ oop, ip: { size: 0.75, valueThreshold: 0.7 } }),
  'ip river rule when ahead by 0.03': make({ oop, ip: { size: 0.75, valueThreshold: 0.6, ahead: 0.03 } }),
  'no river open rule at all': make({}),
};
