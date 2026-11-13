import { NapkinSelector, fittedMixer, fittedTuner } from '../src/index.js';
const make = (ip) => () => ({ selector: new NapkinSelector({ turnCalls: 'ehs2-ip' }), mixer: fittedMixer(), tuner: fittedTuner({ open: { river: { oop: { size: 0.75, valueThreshold: 0.6, ahead: 0.03 }, ip } } }) });
export const variants = {
  'ip size 0.75 thr 0.7': make({ size: 0.75, valueThreshold: 0.7 }),
  'ip size 0.75 thr 0.8': make({ size: 0.75, valueThreshold: 0.8 }),
  'ip size 0.75 thr 0.9': make({ size: 0.75, valueThreshold: 0.9 }),
  'ip size 0.5 thr 0.8': make({ size: 0.5, valueThreshold: 0.8 }),
  'ip size 1.0 thr 0.8': make({ size: 1.0, valueThreshold: 0.8 }),
};
