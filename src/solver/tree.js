// The betting tree of a spot solved by poker-flopsolve, as plain objects: `nodes[id] = { id, kind, round, seat, pot,
// edges, parent, via, invested }`, each action labelled and each node knowing what each player has put in on the way.
import { notation } from '../notation.js';

const KINDS = ['decision', 'chance', 'fold', 'showdown'];

function plainNode(fs, tree, chipScale, id) {
  const edges = [];
  for (let k = 0; k < tree.numEdges[id]; k++) {
    const e = tree.firstEdge[id] + k;
    edges.push({ kind: fs.ACTION_LABELS[tree.edgeAction[e]], to: tree.edgeTarget[e] / chipScale, child: tree.edgeChild[e] });
  }
  const seat = tree.player[id] < 0 ? null : tree.player[id] === 0 ? 'oop' : 'ip';
  return { id, kind: KINDS[tree.kind[id]], round: tree.round[id], seat, pot: tree.pot[id] / chipScale, edges, parent: -1, via: -1, invested: [0, 0] };
}

/** A child reached by an edge: its parent, the edge, and what each player has put in once the edge is taken. */
function link(node, edge, k, child) {
  Object.assign(child, { parent: node.id, via: k, invested: [...node.invested] });
  if (node.kind !== 'chance' && edge.kind !== 'fold' && edge.kind !== 'check') child.invested[node.seat === 'oop' ? 0 : 1] = edge.to;
}

/** Label every edge below a node (a deal has one way on, the next street's first decision, and no label). */
function walk(nodes, id) {
  const node = nodes[id]; const me = node.seat === 'oop' ? 0 : 1;
  node.edges.forEach((edge, k) => {
    if (node.kind === 'chance') { edge.kind = 'deal'; edge.label = ''; } else edge.label = notation(edge.kind, { add: edge.to - node.invested[me], pot: node.pot, to: edge.to, faced: node.invested[1 - me] });
    link(node, edge, k, nodes[edge.child]);
    walk(nodes, edge.child);
  });
}

export function treeOf(fs, spot) {
  const { tree, chipScale } = spot;
  const nodes = Array.from({ length: tree.nodeCount }, (_, id) => plainNode(fs, tree, chipScale, id));
  walk(nodes, 0);
  return nodes;
}
