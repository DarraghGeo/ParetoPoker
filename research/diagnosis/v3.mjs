import { Tuner, fittedTuner, presets } from '../src/index.js';
const napkin = (params) => () => ({ ...presets.napkin(), tuner: fittedTuner(params) });
const flat = (x) => ({ river: { oop: [x, 0, 0, 1.1], ip: [x, 0, 0, 1.1] } });
export const variants = {
  'no tuner (selector floors, as before)': () => presets.napkin(),
  'empty tuner: frequency always filled': () => ({ ...presets.napkin(), tuner: new Tuner([{ set: {} }]) }),
  'defence fitted': napkin({ raise: null }),
  'defence flat 0.9': napkin({ raise: null, defence: flat(0.9) }),
  'defence flat 1.0 + raise rule': napkin({ defence: flat(1) }),
  'defence fitted + raise rule': napkin(),
  'defence flat 0.9 + raise rule': napkin({ defence: flat(0.9) }),
};
