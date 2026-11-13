import { KindMixer, Tuner, fittedMixer, presets } from '../src/index.js';
const facingTurnBet = (c) => c.street === 'turn' && c.facing && (c.spot.raises ?? 0) === 0;
const tuned = (rule) => () => { const base = presets.fitted(); return { ...base, tuner: new Tuner([...base.tuner.rules, rule]) }; };
const mixed = (rule) => () => { const base = presets.fitted(); return { ...base, mixer: new KindMixer({ tables: base.mixer.tables, rules: [...fittedMixer().rules, rule] }) }; };
export const variants = {
  fitted: presets.fitted,
  'never raise a turn bet': tuned({ when: facingTurnBet, set: { frequency: 0 } }),
  'turn raises: no bluffs': tuned({ when: facingTurnBet, set: { bluff: 0 } }),
  'turn raises: twice the bluffs': tuned({ when: facingTurnBet, set: { bluff: 2 } }),
  'value raises a turn bet 10%': mixed({ role: 'value', when: facingTurnBet, share: 0.1 }),
  'turn raise frequency 5% of range': tuned({ when: facingTurnBet, set: { frequency: 0.05 } }),
  'turn raise frequency 10% of range': tuned({ when: facingTurnBet, set: { frequency: 0.1 } }),
};
