// River: the solver's frequencies dealt along exact equity with no mixing (pure cuts), by kind
// of decision. What this loses is what the solver's mixing of different equities is worth.
//   node diagnosis/v55.mjs <set>
import { SETS, measure, format } from '../bin/compare.js';
import { Equity, SelectionContext, cards, presets } from '../src/index.js';
const { NUM_COMBOS } = cards;
const equity = new Equity();
const [set] = process.argv.slice(2);
/** Deals `share` of the range (by weight) to the hands of `ids` in the order given; returns each hand's probability. */
function deal(ids, hero, left, amount, cap = 1) {
  const out = new Float64Array(NUM_COMBOS);
  for (const i of ids) {
    if (amount <= 1e-12) break;
    const take = Math.min(left[i], cap, amount / hero[i]);
    out[i] = take; left[i] -= take; amount -= take * hero[i];
  }
  return out;
}
const cuts = (cap = 1, sizes = 'big first') => (d) => {
  const strength = new SelectionContext({ equity, position: d.position, spot: d.spot, board: d.board, hero: d.hero, villain: d.villain, villainPrior: d.villainPrior, actions: d.actions }).strength;
  const ids = []; for (let i = 0; i < NUM_COMBOS; i++) if (d.hero[i] > 1e-9) ids.push(i);
  ids.sort((a, b) => strength[b] - strength[a]); // strongest first
  const mass = (a, keep = () => true) => ids.reduce((t, i) => t + (keep(i) ? d.hero[i] * d.solved[a][i] : 0), 0);
  const left = new Float64Array(NUM_COMBOS).fill(1);
  const out = d.solved.map(() => new Float64Array(NUM_COMBOS));
  const aggressive = d.actions.flatMap((a, k) => (a.to != null ? [k] : []));
  const facing = (d.spot.toCall ?? 0) > 0;
  const passive = d.actions.findIndex((a) => a.type === (facing ? 'fold' : 'check'));
  // Value from the top down, biggest size first; then calls; then bluffs from the bottom up
  const strong = (i) => strength[i] >= 0.5;
  if (sizes === 'big first' || facing) for (const a of [...aggressive].reverse()) out[a] = deal(ids, d.hero, left, mass(a, strong), facing ? 1 : cap);
  else {
    // every value hand bets `cap` of the time, split over the sizes as the solver's value bets are overall
    const total = aggressive.reduce((t, a) => t + mass(a, strong), 0);
    const all = deal(ids, d.hero, left, total, cap);
    for (const a of aggressive) { const share = total > 0 ? mass(a, strong) / total : 0; for (const i of ids) out[a][i] = all[i] * share; }
  }
  if (facing) { const call = d.actions.findIndex((a) => a.type === 'call'); out[call] = deal(ids, d.hero, left, mass(call)); }
  const weakest = [...ids].reverse();
  for (const a of [...aggressive].reverse()) { const bluffs = deal(weakest, d.hero, left, mass(a, (i) => !strong(i))); for (const i of ids) out[a][i] += bluffs[i]; }
  for (let i = 0; i < NUM_COMBOS; i++) out[passive][i] = d.hero[i] > 1e-9 ? left[i] : d.solved[passive][i];
  for (let i = 0; i < NUM_COMBOS; i++) if (!(d.hero[i] > 1e-9)) d.solved.forEach((p, a) => { out[a][i] = p[i]; });
  return out;
};
const run = async (label, transform, where) => console.log(`${set.padEnd(12)} ${label.padEnd(64)} ${format(await measure(SETS[set], presets.fitted, { ranges: 'solver', hands: 'solver-by-groups', groups: () => [], transform, where }))}`);
if (process.argv[3] !== 'caps') for (const [label, where] of [['every decision', () => true], ['first to act only', (d) => !d.facing], ['facing a bet only', (d) => d.facing && d.raises === 0], ['facing a raise only', (d) => d.facing && d.raises > 0]]) await run(`pure cuts on equity, ${label}`, cuts(), where);
// First to act: every value hand bets only `cap` of the time, so the value bets reach further down and strong hands also check
else for (const cap of [0.9, 0.8, 0.7, 0.6, 0.5]) for (const sizes of ['big first', 'same mix']) await run(`first to act: value hands bet ${cap} of the time, sizes ${sizes}`, cuts(cap, sizes), (d) => !d.facing);
