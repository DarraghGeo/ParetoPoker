import { notation } from '../notation.js';
import { buildTree, levelsFromCurve, solveCurves } from './curves.js';

/**
 * A drawn curve as a solved game the explainer can read: the tree in the same shape as a
 * solver's (`nodes`), and `decisionAt(id)` giving every level's strategy at a decision.
 *
 * @param {Object} input
 * @param {number[]} input.equities The out-of-position player's equity curve, weakest card first.
 * @param {number} input.pot
 * @param {number} input.stack
 * @param {number[]} input.bets Bet sizes in pots.
 * @param {number} input.raise A raise as a multiple of the bet faced (0: no raises).
 * @param {number} [input.iterations]
 */
export function warpGame({ equities, pot, stack, bets, raise, iterations = 300 }) {
  const levels = levelsFromCurve(equities);
  const tree = buildTree({ pot, stack, menu: { bet: bets, raise }, maxRaises: raise > 0 ? 3 : 0 });
  const solved = solveCurves({ first: levels.first, second: levels.second, tree, iterations });
  const start = [levels.first, levels.second];
  const count = levels.first.length;
  // The same plain tree the solver adapter gives
  const nodes = [];
  const index = new Map();
  const add = (node, parent, via, invested) => {
    const id = nodes.length;
    const plain = { id, kind: node.terminal ? (node.terminal === 'fold' ? 'fold' : 'showdown') : 'decision', seat: node.terminal ? null : node.player === 0 ? 'oop' : 'ip', pot: 0, edges: [], parent, via, invested, source: node };
    nodes.push(plain);
    index.set(node, id);
    if (node.terminal) { plain.pot = pot + node.added[0] + node.added[1]; return id; }
    plain.pot = pot + invested[0] + invested[1];
    const owed = invested[1 - node.player] - invested[node.player];
    node.actions.forEach((action, k) => {
      const next = [...invested];
      if (action.type !== 'fold' && action.type !== 'check') next[node.player] += action.add;
      const sized = action.type === 'raise';
      const kind = !sized ? action.type : owed > 0 ? 'raise' : 'bet';
      // A bet or raise that takes the whole stack is All-in
      const all = sized && node.children[k].terminal == null && node.children[k].actions.every((a) => a.type !== 'raise') && action.add >= stack - invested[node.player] - 1e-6;
      const edge = { kind, label: notation(all ? 'allin' : kind, { add: action.add, pot: plain.pot, to: next[node.player], faced: invested[1 - node.player] }), to: next[node.player], child: -1 };
      plain.edges.push(edge);
      edge.child = add(node.children[k], id, k, next);
    });
    return id;
  };
  add(tree.root, -1, -1, [0, 0]);

  const profileOf = new Map();
  const profileAt = (id) => { if (!profileOf.has(id)) profileOf.set(id, solved.at(nodes[id].source)); return profileOf.get(id); };
  // A player's range at a node: his start times every action he took on the way
  const reach = (id, player) => {
    const out = Float64Array.from(start[player]);
    let at = id;
    while (nodes[at].parent >= 0) {
      const parent = nodes[nodes[at].parent];
      if ((parent.seat === 'oop' ? 0 : 1) === player) { const p = profileAt(parent.id)[nodes[at].via]; for (let i = 0; i < count; i++) out[i] *= p[i]; }
      at = parent.id;
    }
    return out;
  };
  return {
    nodes,
    levels,
    /** The decision at a node in the explainer's shape: hands are strength levels, with no cards. */
    decisionAt(id) {
      const node = nodes[id];
      if (node.kind !== 'decision') return null;
      const me = node.seat === 'oop' ? 0 : 1;
      const profile = profileAt(id);
      const mine = reach(id, me);
      const his = reach(id, 1 - me);
      const answers = node.edges.map((edge) => {
        const child = nodes[edge.child];
        if (child.kind !== 'decision') return null;
        const reply = profileAt(child.id);
        const fold = child.edges.findIndex((e) => e.kind === 'fold');
        const check = child.edges.findIndex((e) => e.kind === 'check');
        return { reply, fold, check };
      });
      const hands = [];
      const villain = [];
      let rank = 0;
      for (let i = 0; i < count; i++) {
        if (levels.owner[i] === me && start[me][i] > 0) {
          rank++;
          if (mine[i] > 1e-9) hands.push({ id: i, name: `${rank}`, weight: mine[i], strength: i, equityAtStart: levels.equity[i], strategy: profile.map((p) => p[i]), values: null });
        } else if (levels.owner[i] !== me && his[i] > 1e-9) {
          villain.push({ id: i, weight: his[i], strength: i, answers: answers.map((a) => (a ? { fold: a.fold >= 0 ? a.reply[a.fold][i] : 0, check: a.check >= 0 ? a.reply[a.check][i] : 0 } : null)) });
        }
      }
      const mineIn = node.invested[me];
      const hisIn = node.invested[1 - me];
      return { street: 'river', seat: node.seat, pot: node.pot, toCall: hisIn - mineIn, invested: mineIn, abstract: true,
        actions: node.edges.map((edge) => ({ kind: edge.kind, label: edge.label, add: edge.kind === 'fold' || edge.kind === 'check' ? 0 : edge.to - mineIn, child: edge.child })), hands, villain };
    },
  };
}
