import { fittedTuner, presets } from '../src/index.js';
const napkin = (params) => () => ({ ...presets.napkin(), tuner: fittedTuner(params) });
const size = (oop, ip) => ({ river: { oop, ip } });
const bet = { river: { oop: [0.34, 1.44, -0.5, 1.07, 0, 1], ip: [0.48, 0.28, 0, 0, 0, 1] } };
export const variants = {
  'tuner so far (geometric size)': napkin(),
  'size fitted': napkin({ size: size([0.6, 1.13, 0.33, 2], [0.92, 0.7, 0.33, 2]) }),
  'size flat 0.5 / 0.9 pots': napkin({ size: size([0.5, 0, 0, 2], [0.9, 0, 0, 2]) }),
  'size flat 0.33 / 0.75': napkin({ size: size([0.33, 0, 0, 2], [0.75, 0, 0, 2]) }),
  'size flat 0.75 / 0.75': napkin({ size: size([0.75, 0, 0, 2], [0.75, 0, 0, 2]) }),
  'size flat 0.75 / 1.2': napkin({ size: size([0.75, 0, 0, 2], [1.2, 0, 0, 2]) }),
  'size fitted + bet frequency fitted': napkin({ size: size([0.6, 1.13, 0.33, 2], [0.92, 0.7, 0.33, 2]), bet }),
  'bet frequency fitted (geometric size)': napkin({ bet }),
  'size 0.75/0.75 + bet frequency': napkin({ size: size([0.75, 0, 0, 2], [0.75, 0, 0, 2]), bet }),
};
