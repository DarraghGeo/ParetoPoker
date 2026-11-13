// The fitted preset with one adopted river item taken away, for reading how each item's gain
// depends on the spot (diagnosis/delta.mjs) and what it is worth on a held-out set.
import { KindMixer, NapkinSelector, fittedMixer, fittedTuner, presets } from '../src/index.js';
const make = (o) => () => ({ selector: new NapkinSelector({ turnCalls: 'ehs2-ip' }), mixer: o.mixer ?? fittedMixer(), tuner: o.tuner ?? fittedTuner() });
const R = { size: 0.75, valueThreshold: 0.6 };
export const variants = {
  fitted: presets.fitted,
  'without defence 0.95 facing a river bet': make({ tuner: fittedTuner({ defence: null }) }),
  'without the river raise rule': make({ tuner: fittedTuner({ raise: null }) }),
  'without the in-position river open rule': make({ tuner: fittedTuner({ open: { river: { oop: { ...R, ahead: 0.03 } } } }) }),
  'without the out-of-position river open rule': make({ tuner: fittedTuner({ open: { river: { ip: R } } }) }),
  'without the river value curve (out of position)': make({ mixer: new KindMixer({ tables: fittedMixer().tables, rules: fittedMixer().rules.filter((r, i) => i !== 2) }) }),
  'without any tuner rule (frequencies still filled)': make({ tuner: fittedTuner({ defence: null, raise: null, open: null, defenceVsRaise: null, hisDefence: null }) }),
};
