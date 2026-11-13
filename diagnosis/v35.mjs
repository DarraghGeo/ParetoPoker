import { KindMixer, Tuner, fittedMixer, presets } from '../src/index.js';
const facingRiverBet = (c) => c.street === 'river' && c.facing && (c.spot.raises ?? 0) === 0;
const withTuner = (rule) => () => { const base = presets.fitted(); return { ...base, tuner: new Tuner([...base.tuner.rules, rule]) }; };
const withMix = (rule) => () => { const base = presets.fitted(); return { ...base, mixer: new KindMixer({ tables: base.mixer.tables, rules: [...fittedMixer().rules, rule] }) }; };
export const variants = {
  fitted: presets.fitted,
  'river: value raises 50% of the time': withMix({ role: 'value', when: facingRiverBet, share: 0.5 }),
  'river: value raises 25% of the time': withMix({ role: 'value', when: facingRiverBet, share: 0.25 }),
  'river deep: defence 0.85': withTuner({ when: (c) => facingRiverBet(c) && c.profile.spr >= 2, set: { defence: 0.85 } }),
  'river deep: defence 1.05': withTuner({ when: (c) => facingRiverBet(c) && c.profile.spr >= 2, set: { defence: 1.05 } }),
  'river: raise share halved': withTuner({ when: facingRiverBet, set: (c, t) => ({ frequency: (t?.frequency ?? 0) * 0.5 }) }),
  'river: raise share x1.5': withTuner({ when: facingRiverBet, set: (c, t) => ({ frequency: (t?.frequency ?? 0) * 1.5 }) }),
  'river: calls not mixed, bluff raises 0.5': withTuner({ when: facingRiverBet, set: { bluff: 0.5 } }),
};
