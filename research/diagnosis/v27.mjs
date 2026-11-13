import { KindMixer, TURN_KINDS, fittedMixer, presets } from '../src/index.js';
const bands = [0, 0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 1];
const RIVER = {
  oop: { bands, table: [[2.08, 1.25, 0.76, 0.31, 0.19, 0.04, 0.14, 0.64, 1.69, 2.09, 1.74, 1.29, 1.07]] },
  ip: { bands, table: [[1.88, 1.68, 1.36, 0.74, 0.13, 0.02, 0.02, 0.21, 0.96, 1.79, 2.02, 2.03, 2.03]] },
};
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const spot = (c) => (c.position === 'oop' ? clamp(0.34 + 1.44 * c.profile.rangeAdvantage - 0.5 * c.profile.nutAdvantage + 1.07 * c.profile.polarizationAdvantage, 0.02, 0.9) : clamp(0.48 + 0.28 * c.profile.rangeAdvantage, 0.1, 0.9));
const make = (river, level) => () => ({ ...presets.fitted(), mixer: new KindMixer({ tables: { ...TURN_KINDS, river }, rules: fittedMixer().rules, level: level ? (c, f) => (c.street === 'river' ? level(c, f) : f.bet) : null }) });
export const variants = {
  fitted: presets.fitted,
  'river table, both seats': make(RIVER),
  'river table, out of position only': make({ oop: RIVER.oop }),
  'river table, in position only': make({ ip: RIVER.ip }),
  'river table x level from the spot': make(RIVER, spot),
  'river table x spot level, out of position only': make({ oop: RIVER.oop }, spot),
};
