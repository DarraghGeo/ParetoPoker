import { NapkinSelector, Tuner, fittedMixer, fittedTuner, presets, valueChecks } from '../src/index.js';
const make = (params, mixer = fittedMixer()) => () => ({ selector: new NapkinSelector({ turnCalls: 'ehs2-ip' }), mixer, tuner: fittedTuner(params) });
const open = (oop, ip) => ({ open: { river: { oop, ip } } });
// One size, the nearest to the target, instead of splitting between the two either side
const nearest = (pots) => (spot, wagers) => { let best = 0; wagers.forEach((w, i) => { if (Math.abs(w.add / spot.pot - pots) < Math.abs(wagers[best].add / spot.pot - pots)) best = i; }); return wagers.map((_, i) => (i === best ? 1 : 0)); };
const withRule = (rules) => () => { const base = presets.fitted(); const kept = base.tuner.rules.filter((r) => !String(r.set).includes('sizing: sizeNear')); return { ...base, tuner: new Tuner([...kept, ...rules]) }; };
const riverOpen = (seat) => (c) => c.street === 'river' && c.position === seat && !c.facing;
export const variants = {
  napkin: presets.napkin,
  fitted: presets.fitted,
  'no river open rule': make({ open: null }),
  'open: threshold 0.6 only (geometric size)': make(open({ valueThreshold: 0.6, ahead: 0.03 }, { valueThreshold: 0.6 })),
  'open: size only': make(open({ size: 0.75, valueThreshold: 0.7, ahead: 0.03 }, { size: 0.75, valueThreshold: 0.7 })),
  'open: in position only': make(open(null, { size: 0.75, valueThreshold: 0.6 })),
  'open: out of position only': make(open({ size: 0.75, valueThreshold: 0.6, ahead: 0.03 }, null)),
  'old mixer': make({}, valueChecks({ river: 0.2, turn: 0.4 })),
  'no raise rule': make({ raise: null }),
  'no defence rule': make({ defence: null }),
  'open: size 0.5': make(open({ size: 0.5, valueThreshold: 0.6, ahead: 0.03 }, { size: 0.5, valueThreshold: 0.6 })),
  'open: size 1.0': make(open({ size: 1.0, valueThreshold: 0.6, ahead: 0.03 }, { size: 1.0, valueThreshold: 0.6 })),
};
