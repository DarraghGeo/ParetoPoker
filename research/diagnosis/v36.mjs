import { KindMixer, fittedMixer, presets } from '../src/index.js';
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const formula = (c) => clamp(0.26 + 1.97 * c.profile.rangeAdvantage - 0.64 * c.profile.nutAdvantage + 2.72 * c.profile.polarizationAdvantage, 0.05, 0.95);
const make = (level) => () => { const base = presets.fitted(); return { ...base, mixer: new KindMixer({ tables: base.mixer.tables, rules: fittedMixer().rules, level }) }; };
const oopTurn = (c) => c.position === 'oop' && c.street === 'turn';
export const variants = {
  fitted: presets.fitted,
  'oop turn level from the spot formula': make((c, f) => (oopTurn(c) ? formula(c) : f.bet)),
  'oop turn level: the higher of the two': make((c, f) => (oopTurn(c) ? Math.max(formula(c), f.bet) : f.bet)),
  'oop turn level: their average': make((c, f) => (oopTurn(c) ? (formula(c) + f.bet) / 2 : f.bet)),
  'oop turn: range bet when the formula says 0.7+': make((c, f) => (oopTurn(c) && formula(c) >= 0.7 ? formula(c) : f.bet)),
  'oop turn: range bet when the formula says 0.55+': make((c, f) => (oopTurn(c) && formula(c) >= 0.55 ? formula(c) : f.bet)),
  'oop turn: range bet at most 80%': make((c, f) => (oopTurn(c) && formula(c) >= 0.7 ? Math.min(0.8, formula(c)) : f.bet)),
  'oop turn: range bet at most 65%': make((c, f) => (oopTurn(c) && formula(c) >= 0.7 ? 0.65 : f.bet)),
  'oop turn level from range advantage alone': make((c, f) => (oopTurn(c) ? clamp(0.32 + 2.14 * c.profile.rangeAdvantage, 0.05, 0.95) : f.bet)),
};
