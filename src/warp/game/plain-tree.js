import { notation } from '../../notation.js';

/** A warp tree in the same plain shape the solver adapter gives: ids, seats, pots and labelled edges. */
export function plainTree(root, pot, stack) {
  const build = { nodes: [], pot, stack };
  addNode(build, root, -1, -1, [0, 0]);
  return build.nodes;
}

export const seatIndex = (seat) => (seat === 'oop' ? 0 : 1);

const kindOf = (node) => (node.terminal ? (node.terminal === 'fold' ? 'fold' : 'showdown') : 'decision');

function addNode(build, node, parent, via, invested) {
  const id = build.nodes.length;
  const seat = node.terminal ? null : node.player === 0 ? 'oop' : 'ip';
  const plain = { id, kind: kindOf(node), seat, pot: 0, edges: [], parent, via, invested, source: node };
  build.nodes.push(plain);
  if (node.terminal) { plain.pot = build.pot + node.added[0] + node.added[1]; return id; }
  plain.pot = build.pot + invested[0] + invested[1];
  node.actions.forEach((action, k) => addEdge(build, plain, node, k));
  return id;
}

function addEdge(build, plain, node, k) {
  const { invested } = plain;
  const action = node.actions[k];
  const me = node.player;
  const next = [...invested];
  if (action.type !== 'fold' && action.type !== 'check') next[me] += action.add;
  const kind = action.type !== 'raise' ? action.type : invested[1 - me] - invested[me] > 0 ? 'raise' : 'bet';
  const name = takesStack(build, node, k, invested[me]) ? 'allin' : kind;
  const edge = { kind, label: notation(name, { add: action.add, pot: plain.pot, to: next[me], faced: invested[1 - me] }), to: next[me], child: -1 };
  plain.edges.push(edge);
  edge.child = addNode(build, node.children[k], plain.id, k, next);
}

/** A bet or raise that takes the whole stack is All-in. */
function takesStack(build, node, k, invested) {
  const action = node.actions[k];
  const child = node.children[k];
  if (action.type !== 'raise' || child.terminal != null) return false;
  return child.actions.every((a) => a.type !== 'raise') && action.add >= build.stack - invested - 1e-6;
}
