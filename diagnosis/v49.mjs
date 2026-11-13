import { KindMixer, fittedMixer, presets } from '../src/index.js';
const oopTurnOpen = (c) => c.position === 'oop' && !c.facing && c.street === 'turn';
// Replace the flat out-of-position turn value cap (rule 0) by one that follows range advantage
const make = (share) => () => { const base = presets.fitted(); const rules = fittedMixer().rules; rules[0] = { role: 'value', when: oopTurnOpen, share }; return { ...base, mixer: new KindMixer({ tables: base.mixer.tables, rules }) }; };
export const variants = {
  fitted: presets.fitted,
  'oop turn value cap 1.0 when ahead by 0.1, else 0.45': make((c) => (c.profile.rangeAdvantage >= 0.1 ? 1 : 0.45)),
  'oop turn value cap 0.75 when ahead by 0.1, else 0.45': make((c) => (c.profile.rangeAdvantage >= 0.1 ? 0.75 : 0.45)),
  'oop turn value cap 0.45 + 2 x range advantage, within 0.3-1': make((c) => Math.max(0.3, Math.min(1, 0.45 + 2 * c.profile.rangeAdvantage))),
};
