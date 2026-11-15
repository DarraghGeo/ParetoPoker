import { partOf } from './values.js';

/**
 * An action split by what he does next. For each of his replies: how often he makes it against
 * each hand (`share[combo]`, of the hands that hand can face) and what it adds to the action's
 * value (`value[combo]`, chips). The values add up to the action's. Null when the action does
 * not hand the move to him on this street.
 */
export function byReply(f, a) {
  const child = f.nodes[f.node.edges[a].child];
  if (child.kind !== 'decision') return null;
  const probs = hisStrategy(f, child.id);
  return child.edges.map((edge, k) => {
    const reach = new Float64Array(f.fs.COMBOS);
    for (let c = 0; c < f.fs.COMBOS; c++) { const w = f.his[c] * probs[k][c]; if (w > 0) reach[c] = w; }
    return { kind: edge.kind, label: edge.label, child: edge.child, ...partOf(f, edge.child, reach) };
  });
}

/** His strategy at one of his decisions on this board, by real combination: `probs[k][combo]`. */
function hisStrategy(f, id) {
  const view = f.solution.strategyAt(id, f.at);
  const row = new Int32Array(f.fs.COMBOS).fill(-1);
  view.combos.forEach((combo, i) => { row[combo] = i; });
  return f.nodes[id].edges.map((_, k) => replyShares(f, view, row, k));
}

function replyShares(f, view, row, k) {
  const n = view.actions.length;
  const p = new Float64Array(f.fs.COMBOS);
  for (let c = 0; c < f.fs.COMBOS; c++) {
    const i = row[f.stored[c]];
    if (i >= 0 && f.his[c] > 0) p[c] = view.probs[i * n + k];
  }
  return p;
}
