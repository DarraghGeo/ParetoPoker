import { Mixer, NapkinSelector, Tuner, fittedMixer, fittedTuner, presets, valueChecks } from '../src/index.js';
const without = (pattern) => new Mixer(fittedMixer().rules.filter((r, i) => !pattern.includes(i)));
const make = (o) => () => ({ selector: o.selector ?? new NapkinSelector({ turnCalls: 'ehs2-ip' }), mixer: o.mixer ?? fittedMixer(), tuner: o.tuner ?? fittedTuner() });
export const variants = {
  napkin: presets.napkin,
  fitted: presets.fitted,
  'calls by class in position (not E[HS^2])': make({ selector: new NapkinSelector() }),
  'no ip turn value mixing': make({ mixer: without([1]) }),
  'no cap on raising a turn bet': make({ mixer: without([3]) }),
  'oop turn value 60% not 45%': make({ mixer: new Mixer([{ role: 'value', when: (c) => c.position === 'oop' && !c.facing && c.street === 'turn', share: 0.6 }, ...fittedMixer().rules.slice(1)]) }),
  'no defence vs turn raise': make({ tuner: fittedTuner({ defenceVsRaise: null }) }),
  'no river rules': make({ tuner: fittedTuner({ defence: null, raise: null, open: null }) }),
  'no river open rule': make({ tuner: fittedTuner({ open: null }) }),
  'no river raise rule': make({ tuner: fittedTuner({ raise: null }) }),
  'old mixer, fitted tuner': make({ mixer: valueChecks({ river: 0.2, turn: 0.4 }) }),
};
