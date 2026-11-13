import { NapkinSelector, fittedMixer, fittedTuner } from '../src/index.js';
const make = (ip) => () => ({ selector: new NapkinSelector({ turnCalls: 'ehs2-ip' }), mixer: fittedMixer(), tuner: fittedTuner({ open: { river: { oop: { size: 0.75, valueThreshold: 0.6, ahead: 0.03 }, ip } } }) });
export const variants = { 'thr 0.8': make({ size: 0.75, valueThreshold: 0.8 }), 'thr 0.6': make({ size: 0.75, valueThreshold: 0.6 }) };
