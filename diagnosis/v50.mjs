// Rules that bet more out of position when ahead in range, with the opponent modelled by the
// fitted preset as it is (so the rule cannot change the other seat's picture of its opponent).
import { KindMixer, fittedMixer, presets } from '../src/index.js';
const oopTurnOpen = (c) => c.position === 'oop' && !c.facing && c.street === 'turn';
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const formula = (c) => clamp(0.26 + 1.97 * c.profile.rangeAdvantage - 0.64 * c.profile.nutAdvantage + 2.72 * c.profile.polarizationAdvantage, 0.05, 0.95);
const capFollows = () => { const base = presets.fitted(); const rules = fittedMixer().rules; rules[0] = { role: 'value', when: oopTurnOpen, share: (c) => Math.max(0.3, Math.min(1, 0.45 + 2 * c.profile.rangeAdvantage)) }; return { ...base, mixer: new KindMixer({ tables: base.mixer.tables, rules }) }; };
const rangeBet = () => { const base = presets.fitted(); return { ...base, mixer: new KindMixer({ tables: base.mixer.tables, rules: fittedMixer().rules, level: (c, f) => (oopTurnOpen(c) && formula(c) >= 0.7 ? formula(c) : f.bet) }) }; };
export const variants = {
  'fitted, opponent modelled as fitted (check)': () => ({ ...presets.fitted(), opponent: presets.fitted() }),
  'value cap follows range advantage; opponent modelled as fitted': () => ({ ...capFollows(), opponent: presets.fitted() }),
  'range bet where the formula says 0.7+; opponent modelled as fitted': () => ({ ...rangeBet(), opponent: presets.fitted() }),
};
