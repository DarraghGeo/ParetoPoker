import { Tuner, fittedTuner, presets } from '../src/index.js';
const napkin = (params) => () => ({ ...presets.napkin(), tuner: fittedTuner(params) });
const flat = (x, y = x) => ({ river: { oop: [x, 0, 0, 1.1], ip: [y, 0, 0, 1.1] } });
export const variants = {
  'no tuner': () => presets.napkin(),
  'empty tuner': () => ({ ...presets.napkin(), tuner: new Tuner([{ set: {} }]) }),
  'raise rule only': napkin({ defence: flat(1) }),
  'flat 0.95 + raise': napkin({ defence: flat(0.95) }),
  'flat 0.9 + raise': napkin({ defence: flat(0.9) }),
  'flat 0.85 + raise': napkin({ defence: flat(0.85) }),
  'flat 0.8 + raise': napkin({ defence: flat(0.8) }),
};
