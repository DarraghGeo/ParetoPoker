import { seatIndex } from './plain-tree.js';
import { reachAt } from './reach.js';

/** A warp decision with its hands as strength levels; null where the node is not a decision. */
export function warpDecision(game, id) {
  const node = game.nodes[id];
  if (node.kind !== 'decision') return null;
  const me = seatIndex(node.seat);
  const { hands, villain } = levelsAt(game, node, me);
  const mineIn = node.invested[me];
  const hisIn = node.invested[1 - me];
  const actions = node.edges.map((edge) => ({ kind: edge.kind, label: edge.label, add: unpaid(edge) ? 0 : edge.to - mineIn, child: edge.child }));
  return { street: 'river', seat: node.seat, pot: node.pot, toCall: hisIn - mineIn, invested: mineIn, abstract: true, actions, hands, villain };
}

const unpaid = (edge) => edge.kind === 'fold' || edge.kind === 'check';

/** Our levels with their strategy, and his with how he answers each of our actions. */
function levelsAt(game, node, me) {
  const { levels, start } = game;
  const strategy = game.profileAt(node.id);
  const mine = reachAt(game, node.id, me);
  const his = reachAt(game, node.id, 1 - me);
  const replies = node.edges.map((edge) => replyTo(game, edge));
  const hands = [];
  const villain = [];
  let rank = 0;
  for (let i = 0; i < levels.first.length; i++) {
    const ours = levels.owner[i] === me;
    if (ours && start[me][i] > 0) rank++;
    if (ours && start[me][i] > 0 && mine[i] > 1e-9) hands.push(heroLevel(levels, i, rank, mine[i], strategy));
    else if (!ours && his[i] > 1e-9) villain.push({ id: i, weight: his[i], strength: i, answers: replies.map((reply) => answerAt(reply, i)) });
  }
  return { hands, villain };
}

const heroLevel = (levels, i, rank, weight, strategy) => ({
  id: i, name: `${rank}`, weight, strength: i, equityAtStart: levels.equity[i], strategy: strategy.map((p) => p[i]), values: null,
});

/** His strategy where an action of ours hands him the move, with where his fold, check and call sit. */
function replyTo(game, edge) {
  const child = game.nodes[edge.child];
  if (child.kind !== 'decision') return null;
  const at = (kind) => child.edges.findIndex((e) => e.kind === kind);
  return { reply: game.profileAt(child.id), fold: at('fold'), check: at('check'), call: at('call') };
}

function answerAt(reply, level) {
  if (!reply) return null;
  const share = (k) => (k >= 0 ? reply.reply[k][level] : 0);
  const fold = share(reply.fold);
  const check = share(reply.check);
  const call = share(reply.call);
  return { fold, check, call, more: Math.max(0, 1 - fold - check - call) };
}
