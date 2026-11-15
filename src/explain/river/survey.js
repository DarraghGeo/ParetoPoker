// What the decision looks like for every hand at once: computed once, read per hand.
import { actionWeight, weightOf } from '../rows.js';
import { handRow } from './hand-row.js';
import { AGGRESSIVE, isBluff } from './terms.js';

function addToLevel(levels, row, actions) {
  let level = levels.get(row.hand.strength);
  if (!level) levels.set(row.hand.strength, level = { rows: [], weight: 0, mix: actions.map(() => 0) });
  level.rows.push(row);
  level.weight += row.hand.weight;
  row.hand.strategy.forEach((p, a) => { level.mix[a] += row.hand.weight * p; });
}

/** The hands of each strength, with what they do together. */
function levelsOf(rows, actions) {
  const levels = new Map();
  for (const row of rows) addToLevel(levels, row, actions);
  for (const level of levels.values()) level.mix = level.mix.map((x) => x / level.weight);
  return levels;
}

/** A bet size: how often the range takes it, how much of it bluffs, and the indifference maths at that size. */
function sizeOf(action, a, rows, total, { pot, toCall }) {
  if (!AGGRESSIVE.has(action.kind)) return null;
  let all = 0, bluffs = 0;
  for (const row of rows) {
    const w = row.hand.weight * row.hand.strategy[a];
    all += w;
    if (isBluff(row, a)) bluffs += w;
  }
  const s = action.add > toCall ? (action.add - toCall) / (pot + toCall) : 0;
  return { frequency: all / total, bluffShare: all > 0 ? bluffs / all : 0, s, wanted: s / (1 + 2 * s), needsFolds: s / (1 + s) };
}

/** @param {import('../river.js').Decision} decision */
export function survey(decision) {
  const { hands, actions, pot, toCall } = decision;
  const facing = toCall > 0;
  const rows = hands.map((hand) => handRow(hand, decision));
  const levels = levelsOf(rows, actions);
  const total = weightOf(rows);
  const mix = actions.map((_, a) => actionWeight(rows, a) / total);
  const sizes = actions.map((action, a) => sizeOf(action, a, rows, total, decision));
  const need = facing ? toCall / (pot + toCall) : 0;
  return { decision, facing, rows, levels, mix, sizes, need, byName: new Map(rows.map((r) => [r.hand.name, r])) };
}
