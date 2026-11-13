import { Tuner, presets, sizeNear } from '../src/index.js';
const deep = (c) => c.street === 'river' && !c.facing && c.profile.spr >= 3;
const withRule = (set) => () => { const base = presets.fitted(); return { ...base, tuner: new Tuner([...base.tuner.rules, { when: deep, set }]) }; };
export const variants = {
  fitted: presets.fitted,
  'deep: threshold 0.7': withRule({ valueThreshold: 0.7 }),
  'deep: threshold 0.8': withRule({ valueThreshold: 0.8 }),
  'deep: size 0.33': withRule({ sizing: sizeNear(0.33) }),
  'deep: size 0.5': withRule({ sizing: sizeNear(0.5) }),
  'deep: size 1.1': withRule({ sizing: sizeNear(1.1) }),
  'deep: size 1.5': withRule({ sizing: sizeNear(1.5) }),
  'deep: size 0.33, threshold 0.5': withRule({ sizing: sizeNear(0.33), valueThreshold: 0.5 }),
  'deep: sizes split 0.33 / 0.75 / 1.5 evenly': withRule({ sizing: (spot, wagers) => wagers.map((w, i) => (i < 3 ? 1 : 0)) }),
  'deep: bluff 0.7': withRule({ bluff: 0.7 }),
  'deep: bluff 1.3': withRule({ bluff: 1.3 }),
};
