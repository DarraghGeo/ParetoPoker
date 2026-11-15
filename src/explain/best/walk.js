// The game-tree walk: from a node on, what each hero hand nets against his reach, summed over his hands.
//
// `at`: { board, me, heroes, villains, reach, mode, ctx }. heroes: the hero's combinations still possible on this
// board; villains likewise; reach: his weight on each; ctx: what the walk caches for this board.
import { averageReply, bestReply, keptReply } from './replies.js';
import { foldValues, showdownValues } from './showdown.js';
import { dealtCard, strategyAt, unseen } from './walker.js';

/** A walk from a frame's decision (account.js) on, on its board, with a cache of its own. */
export const atFrame = (f, heroes, villains, reach, mode = 'best') => ({ board: f.board, me: f.me, heroes, villains, reach, mode, ctx: {} });

/** values[h] = sum over his hands of reach x what hand h nets from node `id` on. */
export function walk(g, id, at) {
  const node = g.nodes[id];
  if (node.kind === 'fold') return foldValues(g, node, at);
  if (node.kind === 'showdown') return at.board.length < 5 ? deal(g, id, at) : showdownValues(g, node, at);
  if (node.kind === 'chance') return deal(g, node.edges[0].child, at);
  const st = strategyAt(g, id, at.board);
  if ((node.seat === 'oop' ? 0 : 1) !== at.me) return villainActs(g, node, st, at);
  return heroActs(g, id, node, st, at);
}

/** His move: each of his actions walked with his reach scaled by how often each hand takes it. */
function villainActs(g, node, st, at) {
  const out = new Float64Array(g.N);
  for (let k = 0; k < node.edges.length; k++) {
    const next = villainReach(g, st, at, k);
    if (!next) continue;
    const part = walk(g, node.edges[k].child, { ...at, reach: next });
    for (const h of at.heroes) out[h] += part[h];
  }
  return out;
}

/** His reach after action `k`, or null when none of his hands takes it. */
function villainReach(g, st, { villains, reach }, k) {
  const next = new Float64Array(g.N); let any = false;
  for (const v of villains) {
    const w = reach[v]; if (!w) continue;
    const i = st.rowOf(v); if (i < 0) continue;
    const p = st.probs[i * st.n + k]; if (p > 0) { next[v] = w * p; any = true; }
  }
  return any ? next : null;
}

function heroActs(g, id, node, st, at) {
  const parts = node.edges.map((edge) => walk(g, edge.child, at));
  if (at.mode === 'average') return averageReply(g, st, parts, at.heroes);
  if (at.mode === 'best') return bestReply(g, id, at.board, parts, at.heroes);
  return keptReply(g, id, at.board, parts, at.heroes);
}

/** Every next card, each as likely as the others once both hands are known. */
function deal(g, id, at) {
  const out = new Float64Array(g.N);
  const n = 52 - at.board.length - 4;
  for (const x of unseen(at.board)) {
    const { hs, vs, next } = dealtCard(g, at.heroes, at.villains, at.reach, x);
    const part = walk(g, id, { board: [...at.board, x], me: at.me, heroes: hs, villains: vs, reach: next, mode: at.mode, ctx: {} });
    for (const h of hs) out[h] += part[h] / n;
  }
  return out;
}
