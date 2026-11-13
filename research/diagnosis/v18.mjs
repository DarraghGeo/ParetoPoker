import { Mixer, NapkinSelector, fittedMixer, fittedTuner } from '../src/index.js';
const facingTurnBet = (c) => c.street === 'turn' && c.facing && (c.spot.raises ?? 0) === 0;
const tuner = (extra = {}) => fittedTuner({ defenceVsRaise: { turn: { oop: 1.25, ip: 1.25 } }, ...extra });
const make = (cap, extra) => () => ({
  selector: new NapkinSelector(),
  mixer: new Mixer([...fittedMixer().rules, ...(cap ? [{ role: 'value', when: facingTurnBet, share: cap }] : [])]),
  tuner: tuner(extra),
});
export const variants = {
  'no cap on raising': make(null),
  'value raises 50% of the time': make(0.5),
  'value raises 25% of the time': make(0.25),
  'value raises 10% of the time': make(0.1),
  'never raise a turn bet': () => ({ selector: new NapkinSelector(), mixer: fittedMixer(), tuner: tuner({ raise: { river: { oop: [-0.02, 0.21, 0.08, 0, 0.5], ip: [-0.25, 1.47, 0.01, 0, 0.6] }, turn: { oop: [0, 0, 0, 0, 0], ip: [0, 0, 0, 0, 0] } } }) }),
};
