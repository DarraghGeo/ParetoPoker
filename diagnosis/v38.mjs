import { cards, presets } from '../src/index.js';
const facingRiverBet = (c) => c.street === 'river' && c.facing;
const { COMBO_A, COMBO_B, NUM_COMBOS } = cards;
function blocked(range) {
  const per = new Float64Array(52); let total = 0;
  for (let i = 0; i < NUM_COMBOS; i++) if (range[i] > 0) { total += range[i]; per[COMBO_A[i]] += range[i]; per[COMBO_B[i]] += range[i]; }
  return Float64Array.from({ length: NUM_COMBOS }, (_, i) => (total > 0 ? (per[COMBO_A[i]] + per[COMBO_B[i]] - range[i]) / total : 0));
}
const parts = (c) => {
  const value = c.villain.map((w, i) => (c.villainStrength[i] > 0.5 ? w : 0));
  const bluffs = c.villain.map((w, i) => w - value[i]);
  return { blocksValue: blocked(value), blocksBluffs: blocked(bluffs), versusValue: c.equityAgainst(value) };
};
const callBy = (score, seats = ['oop', 'ip']) => () => {
  const base = presets.fitted(); const napkin = base.selector;
  return { ...base, selector: { value: (c, w) => napkin.value(c, w), bluff: (c, w) => napkin.bluff(c, w), call: (c) => (facingRiverBet(c) && seats.includes(c.position) ? score(c) : napkin.call(c)) } };
};
export const variants = {
  fitted: presets.fitted,
  'equity vs his bets': callBy((c) => c.strength),
  'equity vs his starting range': callBy((c) => c.priorStrength),
  'equity + 0.5 starting-range equity': callBy((c) => c.strength.map((e, i) => e + 0.5 * c.priorStrength[i])),
  'equity + starting-range equity': callBy((c) => c.strength.map((e, i) => e + c.priorStrength[i])),
  'equity - 0.3 blocks his bluffs': callBy((c) => { const p = parts(c); return c.strength.map((e, i) => e - 0.3 * p.blocksBluffs[i]); }),
  'equity + 0.3 blocks his value': callBy((c) => { const p = parts(c); return c.strength.map((e, i) => e + 0.3 * p.blocksValue[i]); }),
  'equity + prior + blockers both ways': callBy((c) => { const p = parts(c); return c.strength.map((e, i) => e + 0.5 * c.priorStrength[i] + 0.3 * p.blocksValue[i] - 0.3 * p.blocksBluffs[i]); }),
  'equity + prior - 0.5 blocks his bluffs': callBy((c) => { const p = parts(c); return c.strength.map((e, i) => e + 0.5 * c.priorStrength[i] - 0.5 * p.blocksBluffs[i]); }),
};
