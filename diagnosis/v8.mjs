import { Mixer, Tuner, fittedTuner, presets, sizeNear } from '../src/index.js';
import { NapkinSelector } from '../src/index.js';
// Out of position, first to act on the river: size, value threshold and a mixing curve over strength
const oopRiverOpen = (c) => c.street === 'river' && c.position === 'oop' && !c.facing;
function parts({ size, threshold, mix }) {
  const base = fittedTuner();
  const tuner = new Tuner([...base.rules, { when: oopRiverOpen, set: { ...(size ? { sizing: sizeNear(size) } : {}), ...(threshold ? { valueThreshold: threshold } : {}) } }]);
  const curve = {
    none: null,
    flat: () => 0.8,
    traps: (c) => c.strength.map((e) => (e >= 0.9 ? 0.5 : 0.75)),
    solver: (c) => c.strength.map((e) => (e >= 0.9 ? 0.5 : e >= 0.7 ? 0.7 : e >= 0.6 ? 0.55 : 0.35)),
  }[mix];
  const rules = [{ role: 'value', when: (c) => c.position === 'oop' && !c.facing && c.street === 'turn', share: 0.6 }];
  if (curve) rules.push({ role: 'value', when: oopRiverOpen, share: curve });
  return () => ({ selector: new NapkinSelector(), mixer: new Mixer(rules), tuner });
}
export const variants = {};
for (const size of [null, 0.33, 0.5, 0.75]) for (const threshold of [0.5, 0.6, 0.7]) for (const mix of ['none', 'flat', 'traps', 'solver']) {
  variants[`size ${size ?? 'geo'} thr ${threshold} mix ${mix}`] = parts({ size, threshold, mix });
}
