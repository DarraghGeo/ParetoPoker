import { NapkinSelector, presets } from '../src/index.js';
const facingTurnBet = (c) => c.street === 'turn' && c.facing && (c.spot.raises ?? 0) === 0;
// The fitted preset with another calling order facing a turn bet, in position only
const callBy = (score) => () => {
  const base = presets.fitted();
  const napkin = base.selector;
  return { ...base, selector: { value: (c, w) => napkin.value(c, w), bluff: (c, w) => napkin.bluff(c, w), call: (c) => (facingTurnBet(c) && c.position === 'ip' ? score(c) : napkin.call(c)) } };
};
const f = (c) => c.features;
const BONUS = [0, 0.25, 0.45, 0.8];
export const variants = {
  fitted: presets.fitted,
  'E[HS^2] alone': callBy((c) => f(c).ehs2),
  'E[HS^2] + 0.5 draw equity': callBy((c) => f(c).ehs2.map((e, i) => e + 0.5 * f(c).drawEquity[i])),
  'equity + 0.5 swing': callBy((c) => c.strength.map((e, i) => e + 0.5 * f(c).swing[i])),
  'strength now + a bonus by draw': callBy((c) => f(c).strengthNow.map((e, i) => e + BONUS[c.kinds.draw[i]])),
  'equity + a bonus by draw': callBy((c) => c.strength.map((e, i) => e + 0.5 * BONUS[c.kinds.draw[i]])),
  'E[HS^2] + upside': callBy((c) => f(c).ehs2.map((e, i) => e + f(c).upside[i])),
  'E[HS^2] + equity vs his starting range': callBy((c) => f(c).ehs2.map((e, i) => e + 0.5 * c.priorStrength[i])),
};
