// Ablation on a held-out set: the fitted preset with one adopted turn item taken away at a time.
import { KindMixer, Mixer, NapkinSelector, fittedMixer, fittedTuner, presets } from '../src/index.js';
const rules = () => fittedMixer().rules;
const make = (o) => () => ({ selector: o.selector ?? new NapkinSelector({ turnCalls: 'ehs2-ip' }), mixer: o.mixer ?? fittedMixer(), tuner: o.tuner ?? fittedTuner() });
export const variants = {
  fitted: presets.fitted,
  'without the kind table (order with caps instead)': make({ mixer: new Mixer(rules()) }),
  'without the cap on raising a turn bet': make({ mixer: new KindMixer({ tables: fittedMixer().tables, rules: rules().filter((r, i) => i !== 3) }) }),
  'without the turn value caps': make({ mixer: new KindMixer({ tables: fittedMixer().tables, rules: rules().filter((r, i) => i > 1) }) }),
  'without defence 1.25 facing a turn raise': make({ tuner: fittedTuner({ defenceVsRaise: null }) }),
  'without E[HS^2] calls in position when deep': make({ selector: new NapkinSelector() }),
  'without the river rules': make({ tuner: fittedTuner({ defence: null, raise: null, open: null }) }),
  'without any tuner rule (frequencies still filled)': make({ tuner: fittedTuner({ defence: null, raise: null, open: null, defenceVsRaise: null, hisDefence: null }) }),
};
