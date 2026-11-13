import { KindMixer, Tuner, fittedMixer, presets, sizeNear } from '../src/index.js';
const ipRiverOpen = (c) => c.street === 'river' && c.position === 'ip' && !c.facing;
const tuned = (set) => () => { const base = presets.fitted(); return { ...base, tuner: new Tuner([...base.tuner.rules, { when: ipRiverOpen, set }]) }; };
const mixed = (share) => () => { const base = presets.fitted(); return { ...base, mixer: new KindMixer({ tables: base.mixer.tables, rules: [...fittedMixer().rules, { role: 'value', when: ipRiverOpen, share }] }) }; };
export const variants = {
  fitted: presets.fitted,
  'ip river: bluffs x0.7': tuned({ bluff: 0.7 }),
  'ip river: bluffs x1.3': tuned({ bluff: 1.3 }),
  'ip river: value bets 85% of the time': mixed(0.85),
  'ip river: thin value (under 85% equity) bets 60%': mixed((c) => c.strength.map((e) => (e >= 0.85 ? 1 : 0.6))),
  'ip river: size 0.5': tuned({ sizing: sizeNear(0.5) }),
  'ip river: size 1.0': tuned({ sizing: sizeNear(1.0) }),
  'ip river: value x0.85': tuned({ value: 0.85 }),
};
