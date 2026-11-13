import { EquitySelector, Mixer, NapkinSelector, fittedMixer, fittedTuner } from '../src/index.js';
const facingTurnBet = (c) => c.street === 'turn' && c.facing && (c.spot.raises ?? 0) === 0;
const tuner = () => fittedTuner({ defenceVsRaise: { turn: { oop: 1.25, ip: 1.25 } } });
const mixer = () => new Mixer([...fittedMixer().rules, { role: 'value', when: facingTurnBet, share: 0.25 }]);
const make = (selector) => () => ({ selector: selector(), mixer: mixer(), tuner: tuner() });
// A calling order from one score over the forms of equity
const callBy = (score) => () => {
  const base = new NapkinSelector();
  return { value: (c, w) => base.value(c, w), bluff: (c, w) => base.bluff(c, w), call: (c) => (facingTurnBet(c) ? score(c) : base.call(c)) };
};
const f = (c) => c.features;
export const variants = {
  'napkin classes (as now)': make(() => new NapkinSelector()),
  'napkin ehs2 + equity vs his value': make(() => new NapkinSelector({ turnCalls: 'ehs2' })),
  'equity vs his bets': make(callBy((c) => c.strength)),
  'E[HS^2]': make(callBy((c) => f(c).ehs2)),
  'equity + draw equity': make(callBy((c) => c.strength.map((e, i) => e + f(c).drawEquity[i]))),
  'equity + 0.5 swing': make(callBy((c) => c.strength.map((e, i) => e + 0.5 * f(c).swing[i]))),
  'equity vs his starting range': make(callBy((c) => c.priorStrength)),
  'best-card equity': make(callBy((c) => f(c).bestCard)),
};
