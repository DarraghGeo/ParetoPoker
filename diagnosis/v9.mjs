import { Mixer, Tuner, fittedTuner, sizeNear, NapkinSelector } from '../src/index.js';
const oopRiverOpen = (c) => c.street === 'river' && c.position === 'oop' && !c.facing;
function parts({ size = 0.75, threshold = 0.6, top, rest, edge }) {
  const tuner = new Tuner([...fittedTuner().rules, { when: oopRiverOpen, set: { sizing: sizeNear(size), valueThreshold: threshold } }]);
  const rules = [{ role: 'value', when: (c) => c.position === 'oop' && !c.facing && c.street === 'turn', share: 0.6 },
    { role: 'value', when: oopRiverOpen, share: (c) => c.strength.map((e) => (e >= edge ? top : rest)) }];
  return () => ({ selector: new NapkinSelector(), mixer: new Mixer(rules), tuner });
}
export const variants = {};
for (const edge of [0.85, 0.9, 0.95]) for (const top of [0.3, 0.5, 0.7]) for (const rest of [0.65, 0.75, 0.9]) variants[`edge ${edge} top ${top} rest ${rest}`] = parts({ edge, top, rest });
for (const size of [0.6, 1.0, 1.25]) variants[`size ${size} edge 0.9 top 0.5 rest 0.75`] = parts({ size, edge: 0.9, top: 0.5, rest: 0.75 });
