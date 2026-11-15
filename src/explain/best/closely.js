// One action looked at closely: its worth with the best play afterwards, and that worth split three ways, the hand's
// later play held to that best reply throughout so the parts add up.
import { addInto, faces, listsOf, nanArray, perHand, shareOf, tally } from './reach.js';
import { atFrame, walk } from './walk.js';
import { dealtCard, strategyAt, unseen } from './walker.js';

/** His reach once he takes reply `k`. */
function replyReach(g, f, st, villains, k) {
  const reach = new Float64Array(g.N);
  for (const v of villains) { const i = st.rowOf(v); if (i >= 0) reach[v] = f.his[v] * st.probs[i * st.n + k]; }
  return reach;
}

/** By what he does next: the hand's best play after each of his replies is its best play, so the parts are the whole. */
function byReplies(g, f, child, { heroes, villains }, total) {
  const st = strategyAt(g, child.id, f.board);
  return child.edges.map((e, k) => {
    const reach = replyReach(g, f, st, villains, k);
    const raw = walk(g, e.child, atFrame(f, heroes, villains, reach));
    addInto(total, raw, heroes);
    return { kind: e.kind, label: e.label, share: shareOf(g, f, heroes, reach, villains), value: perHand(g, f, heroes, raw) };
  });
}

/** One card's part: its value, what the hand nets once it comes, and how much of the time it comes (adding to 1). */
function cardShares(g, f, { hs, vs, next }, raw, n) {
  const t = tally(g, next, vs);
  const value = nanArray(g.N); const then = nanArray(g.N); const weight = nanArray(g.N);
  for (const h of hs) {
    value[h] = raw[h] / n / f.mass[h];
    const left = faces(g, t, next, h);
    then[h] = left > 0 ? raw[h] / left : NaN;
    weight[h] = left / n / f.mass[h];
  }
  return { value, then, weight };
}

/** By the card that comes: likewise, the best play on each card. */
function byCards(g, f, child, { heroes, villains }, total) {
  const n = 52 - f.board.length - 4;
  return unseen(f.board).map((x) => {
    const dealt = dealtCard(g, heroes, villains, f.his, x);
    const at = { ...atFrame(f, dealt.hs, dealt.vs, dealt.next), board: [...f.board, x] };
    const raw = walk(g, child.edges[0].child, at);
    addInto(total, raw, dealt.hs, 1 / n);
    return { card: x, ...cardShares(g, f, dealt, raw, n) };
  });
}

/** His reach split by `groupOf` of his hand (hands it gives no group left out). */
function groupReaches(g, f, villains, groupOf) {
  const groups = new Map();
  for (const v of villains) {
    const group = groupOf(v); if (group == null) continue;
    if (!groups.has(group)) groups.set(group, new Float64Array(g.N));
    groups.get(group)[v] = f.his[v];
  }
  return groups;
}

/** By what he holds: the same later play, valued against each part of his range (it walks the tree again). */
function byHoldings(g, f, edge, { heroes, villains, full }, groupOf) {
  g.plan = new Map();
  walk(g, edge.child, atFrame(f, heroes, villains, full));
  const holdings = new Map();
  for (const [group, reach] of groupReaches(g, f, villains, groupOf)) {
    const share = shareOf(g, f, heroes, reach, villains);
    holdings.set(group, { share, value: perHand(g, f, heroes, walk(g, edge.child, atFrame(f, heroes, villains, reach, 'fixed'))) });
  }
  return holdings;
}

/** The action's worth, split by his reply or by the next card when the action hands him the move or ends the street. */
function splitByNext(g, f, edge, hands, total) {
  const child = g.nodes[edge.child];
  if (child.kind === 'decision') return { replies: byReplies(g, f, child, hands, total), cards: null };
  if (child.kind === 'chance') return { replies: null, cards: byCards(g, f, child, hands, total) };
  addInto(total, walk(g, edge.child, atFrame(f, hands.heroes, hands.villains, hands.full)), hands.heroes);
  return { replies: null, cards: null };
}

/**
 * @returns {{
 *   value: Float64Array,
 *   replies: null | { kind, label, share: Float64Array, value: Float64Array }[],   his reply, when the action hands him the move
 *   holdings: Map<string, { share: Float64Array, value: Float64Array }>,           by `groupOf(combo)` of his hand
 *   cards: null | { card, value: Float64Array, then: Float64Array, weight: Float64Array }[],             the next card, when the action ends the street
 * }}
 */
export function closely(g, f, a, groupOf) {
  const hands = { ...listsOf(g, f), full: Float64Array.from(f.his) };
  const edge = f.node.edges[a];
  const total = new Float64Array(g.N);
  g.plan = null;
  const { replies, cards } = splitByNext(g, f, edge, hands, total);
  const value = perHand(g, f, hands.heroes, total);
  const holdings = groupOf ? byHoldings(g, f, edge, hands, groupOf) : new Map();
  g.plan = null;
  return { value, replies, holdings, cards };
}
