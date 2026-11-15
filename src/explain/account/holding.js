import { partOf } from './values.js';

/**
 * An action split by what he holds. `groupOf(combo)` names the group of each of his hands (any
 * string; null leaves a hand out, and then the parts no longer add up to the whole). Returns,
 * per group, `share[combo]` (how much of what the hand faces is that group) and `value[combo]`.
 */
export function byHolding(f, a, groupOf) {
  const out = new Map();
  for (const [group, reach] of reachByGroup(f, groupOf)) out.set(group, partOf(f, f.node.edges[a].child, reach));
  return out;
}

/** His range split into the groups `groupOf` names, by real combination. */
function reachByGroup(f, groupOf) {
  const groups = new Map();
  for (let c = 0; c < f.fs.COMBOS; c++) {
    const group = f.his[c] > 0 ? groupOf(c) : null;
    if (group == null) continue;
    if (!groups.has(group)) groups.set(group, new Float64Array(f.fs.COMBOS));
    groups.get(group)[c] = f.his[c];
  }
  return groups;
}
