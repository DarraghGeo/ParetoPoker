import { Mixer, NapkinSelector, fittedMixer, fittedTuner } from '../src/index.js';
const facingTurnBet = (c) => c.street === 'turn' && c.facing && (c.spot.raises ?? 0) === 0;
const vsRaise = { defenceVsRaise: { turn: { oop: 1.25, ip: 1.25 } } };
const capped = () => new Mixer([...fittedMixer().rules, { role: 'value', when: facingTurnBet, share: 0.25 }]);
export const variants = {
  'B: + defence 1.25 vs a turn raise': () => ({ selector: new NapkinSelector(), mixer: fittedMixer(), tuner: fittedTuner(vsRaise) }),
  'C: B + value raises a turn bet 25%': () => ({ selector: new NapkinSelector(), mixer: capped(), tuner: fittedTuner(vsRaise) }),
  'D: C + E[HS^2] calls in position': () => ({ selector: new NapkinSelector({ turnCalls: 'ehs2-ip' }), mixer: capped(), tuner: fittedTuner(vsRaise) }),
  'E: D without the river rules': () => ({ selector: new NapkinSelector({ turnCalls: 'ehs2-ip' }), mixer: capped(), tuner: fittedTuner({ ...vsRaise, defence: null, raise: null, open: null }) }),
};
