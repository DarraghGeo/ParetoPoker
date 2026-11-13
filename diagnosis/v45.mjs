import { NapkinSelector, Tuner, fittedMixer, fittedTuner, presets } from '../src/index.js';
const nearest = (pots, tie) => (spot, wagers) => {
  let best = 0;
  wagers.forEach((w, i) => { const d = Math.abs(w.add / spot.pot - pots); const b = Math.abs(wagers[best].add / spot.pot - pots); if (d < b - 1e-9 || (Math.abs(d - b) < 1e-9 && tie === 'larger')) best = i; });
  return wagers.map((_, i) => (i === best ? 1 : 0));
};
const riverOpen = (c) => c.street === 'river' && !c.facing && (c.position === 'ip' || c.profile.rangeAdvantage >= 0.03);
const make = (set) => () => ({ selector: new NapkinSelector({ turnCalls: 'ehs2-ip' }), mixer: fittedMixer(), tuner: new Tuner([...fittedTuner({ open: null }).rules, { when: riverOpen, set }]) });
export const variants = {
  'split around 0.75 (as fitted)': presets.fitted,
  'nearest single size to 0.75, larger on a tie': make({ sizing: nearest(0.75, 'larger'), valueThreshold: 0.6 }),
  'nearest single size to 0.75, smaller on a tie': make({ sizing: nearest(0.75, 'smaller'), valueThreshold: 0.6 }),
  'geometric size, threshold 0.6': make({ valueThreshold: 0.6 }),
  'nearest single size to 1.0': make({ sizing: nearest(1.0, 'smaller'), valueThreshold: 0.6 }),
};
