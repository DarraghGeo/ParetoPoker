import { KindMixer, TURN_KINDS, fittedMixer, presets } from '../src/index.js';
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const spotLevel = (c, f) => (c.position === 'oop' ? clamp(0.26 + 1.97 * c.profile.rangeAdvantage - 0.64 * c.profile.nutAdvantage + 2.72 * c.profile.polarizationAdvantage, 0.05, 0.95) : 0.47);
const make = (o) => () => ({ ...presets.fitted(), mixer: new KindMixer({ tables: TURN_KINDS, rules: fittedMixer().rules, ...o }) });
export const variants = {
  fitted: presets.fitted,
  'kind table x the engine\'s bet frequency': make({}),
  'kind table x the level from the spot': make({ level: spotLevel }),
  'kind table, out of position only': make({ tables: { oop: TURN_KINDS.oop } }),
  'kind table, in position only': make({ tables: { ip: TURN_KINDS.ip } }),
  'kind table x spot level, out of position only': make({ tables: { oop: TURN_KINDS.oop }, level: spotLevel }),
};
