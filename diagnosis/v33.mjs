import { Tuner, presets } from '../src/index.js';
const withRule = (rule) => () => { const base = presets.fitted(); return { ...base, tuner: new Tuner([...base.tuner.rules, rule]) }; };
export const variants = {
  fitted: presets.fitted,
  'raises use the smallest size': withRule({ when: (c) => c.facing, set: { sizing: 'smallest' } }),
  'raises use the smallest size, river only': withRule({ when: (c) => c.facing && c.street === 'river', set: { sizing: 'smallest' } }),
  'raises split evenly over the sizes': withRule({ when: (c) => c.facing, set: { sizing: 'mixed' } }),
};
