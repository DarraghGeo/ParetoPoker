import { fittedTuner, presets } from '../src/index.js';
const napkin = (params) => () => ({ ...presets.napkin(), tuner: fittedTuner(params) });
const d = (oop, ip) => ({ defence: { river: { oop, ip } } });
export const variants = {
  'napkin, fundamentals': () => presets.napkin(),
  'defence as fitted': napkin(),
  'defence flat 0.85/0.9': napkin(d([0.85, 0, 0, 1], [0.9, 0, 0, 1])),
  'defence flat 0.9': napkin(d([0.9, 0, 0, 1], [0.9, 0, 0, 1])),
  'defence slope 0.5': napkin(d([1.0, 0.5, 0.5, 1.1], [1.0, 0.5, 0.5, 1.1])),
  'defence fitted, cap 1.0': napkin(d([1.14, 1.09, 0.5, 1.0], [1.12, 0.93, 0.5, 1.0])),
  'defence ip only': napkin(d([1, 0, 0, 1], [1.12, 0.93, 0.5, 1.1])),
};
