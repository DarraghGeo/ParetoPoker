import { Mixer, Tuner, fittedTuner, sizeNear, NapkinSelector } from '../src/index.js';
const riverOpen = (seat) => (c) => c.street === 'river' && c.position === seat && !c.facing;
export function parts({ ipSize = null, ipThreshold = 0.7, ipTop = null }) {
  const rules = [...fittedTuner().rules, { when: riverOpen('oop'), set: { sizing: sizeNear(0.75), valueThreshold: 0.6 } },
    { when: riverOpen('ip'), set: { ...(ipSize ? { sizing: ipSize === 'split' ? (spot, wagers) => wagers.map((w, i) => (wagers.length === 1 ? 1 : i === wagers.length - 1 ? 0.3 : i === wagers.length - 2 ? 0.7 : 0)) : sizeNear(ipSize) } : {}), valueThreshold: ipThreshold } }];
  const mix = [{ role: 'value', when: (c) => c.position === 'oop' && !c.facing && c.street === 'turn', share: 0.6 },
    { role: 'value', when: riverOpen('oop'), share: (c) => c.strength.map((e) => (e >= 0.9 ? 0.5 : 0.75)) }];
  return () => ({ selector: new NapkinSelector(), mixer: new Mixer(mix), tuner: new Tuner(rules) });
}
export const variants = {};
for (const ipSize of [null, 0.75, 1.0, 1.25, 'split']) for (const ipThreshold of [0.6, 0.7, 0.8]) variants[`ip size ${ipSize ?? 'geo'} thr ${ipThreshold}`] = parts({ ipSize, ipThreshold });
