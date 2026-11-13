import { Tuner, presets } from '../src/index.js';
const facingRiverBet = (c) => c.street === 'river' && c.facing && (c.spot.raises ?? 0) === 0;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
// Rules added after the fitted ones override them field by field
const withRules = (...rules) => () => { const base = presets.fitted(); return { ...base, tuner: new Tuner([...base.tuner.rules, ...rules]) }; };
const defence = (f) => ({ when: facingRiverBet, set: (c) => ({ defence: f(c.profile.rangeAdvantage) }) });
// Undo the fitted raise rule (frequency) when far behind in range
const raiseOnlyFrom = (ra) => ({ when: (c) => facingRiverBet(c) && c.profile.rangeAdvantage < ra, set: { frequency: undefined } });
export const variants = {
  fitted: presets.fitted,
  'defence 1.0 when ahead by 0.1, else 0.95': withRules(defence((ra) => (ra >= 0.1 ? 1 : 0.95))),
  'defence 1.0 - 0.5 x (0.1 - RA), within 0.85-1.0': withRules(defence((ra) => clamp(1 - 0.5 * (0.1 - ra), 0.85, 1))),
  'defence 1.0 - 1.0 x (0.1 - RA), within 0.8-1.0': withRules(defence((ra) => clamp(1 - (0.1 - ra), 0.8, 1))),
  'defence 1.0 - 0.5 x (0.1 - RA), within 0.85-1.05': withRules(defence((ra) => clamp(1 - 0.5 * (0.1 - ra), 0.85, 1.05))),
  'defence 0.9 behind (RA < -0.03), 0.95 level, 1.0 ahead': withRules(defence((ra) => (ra < -0.03 ? 0.9 : ra < 0.1 ? 0.95 : 1))),
  'raise rule only when RA >= -0.1': withRules(raiseOnlyFrom(-0.1)),
  'raise rule only when RA >= 0': withRules(raiseOnlyFrom(0)),
};
