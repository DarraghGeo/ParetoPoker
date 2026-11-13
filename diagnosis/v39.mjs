import { presets } from '../src/index.js';
const facingTurnBet = (c) => c.street === 'turn' && c.facing && (c.spot.raises ?? 0) === 0;
const callBy = (score, when = () => true) => () => {
  const base = presets.fitted(); const napkin = base.selector;
  return { ...base, selector: { value: (c, w) => napkin.value(c, w), bluff: (c, w) => napkin.bluff(c, w), call: (c) => (facingTurnBet(c) && when(c) ? score(c) : napkin.call(c)) } };
};
export const variants = {
  fitted: presets.fitted,
  'turn calls by starting-range equity, both seats': callBy((c) => c.priorStrength),
  'turn calls by starting-range equity, out of position': callBy((c) => c.priorStrength, (c) => c.position === 'oop'),
  'turn calls by E[HS^2] + starting-range equity, out of position': callBy((c) => c.features.ehs2.map((e, i) => e + 0.5 * c.priorStrength[i]), (c) => c.position === 'oop'),
  'turn calls by starting-range equity, in position when shallow': callBy((c) => c.priorStrength, (c) => c.position === 'ip' && c.profile.spr < 2),
};
