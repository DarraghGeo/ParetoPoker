import { fittedTuner, presets } from '../src/index.js';
const napkin = (params) => () => ({ ...presets.napkin(), tuner: fittedTuner(params) });
const flat = (x, y = x) => ({ river: { oop: [x, 0, 0, 1.1], ip: [y, 0, 0, 1.1] } });
export const variants = { 'no tuner': () => presets.napkin() };
for (const d of [1, 0.95, 0.9]) for (const h of [1, 0.9, 0.8, 0.7]) variants[`defence ${d}, his ${h}`] = napkin({ defence: flat(d), hisDefence: flat(h) });
