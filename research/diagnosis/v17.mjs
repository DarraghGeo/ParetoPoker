import { NapkinSelector, fittedMixer, fittedTuner, presets } from '../src/index.js';
const make = (params) => () => ({ selector: new NapkinSelector(), mixer: fittedMixer(), tuner: fittedTuner(params) });
const R = { oop: [0.95, 0, 0, 1.1], ip: [0.95, 0, 0, 1.1] };
const raiseRiver = { oop: [-0.02, 0.21, 0.08, 0, 0.5], ip: [-0.25, 1.47, 0.01, 0, 0.6] };
const vsRaise = (x) => ({ defenceVsRaise: { turn: { oop: x, ip: x } } });
export const variants = {
  fitted: presets.fitted,
  'vs turn raise 1.1': make(vsRaise(1.1)),
  'vs turn raise 1.2': make(vsRaise(1.2)),
  'vs turn raise 1.35': make(vsRaise(1.35)),
  'turn bet defence 0.9 / 1.0': make({ defence: { river: R, turn: { oop: [0.9, 0, 0, 1.2], ip: [1.0, 0, 0, 1.2] } } }),
  'turn bet defence 1.0 / 1.1': make({ defence: { river: R, turn: { oop: [1.0, 0, 0, 1.2], ip: [1.1, 0, 0, 1.2] } } }),
  'turn raise share 0.23 / 0.15': make({ raise: { river: raiseRiver, turn: { oop: [0.23, 0, 0, 0, 0.5], ip: [0.15, 0, 0, 0, 0.5] } } }),
  'turn raise share 0.1 / 0.1': make({ raise: { river: raiseRiver, turn: { oop: [0.1, 0, 0, 0, 0.5], ip: [0.1, 0, 0, 0, 0.5] } } }),
};
