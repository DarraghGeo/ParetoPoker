import { fittedTuner, presets } from '../src/index.js';
const napkin = (params) => () => ({ ...presets.napkin(), tuner: fittedTuner(params) });
const off = { defence: null, raise: null };
export const variants = {
  'fundamentals (raise bluffs now bounded)': napkin(off),
  'raise rule': napkin({ ...off, raise: undefined }),
  'defence flat 0.9': napkin({ ...off, defence: { river: { oop: [0.9, 0, 0, 1], ip: [0.9, 0, 0, 1] } } }),
  'defence fitted': napkin({ ...off, defence: undefined }),
  'raise rule + defence flat 0.9': napkin({ defence: { river: { oop: [0.9, 0, 0, 1], ip: [0.9, 0, 0, 1] } } }),
  'raise rule + defence fitted': napkin(),
};
