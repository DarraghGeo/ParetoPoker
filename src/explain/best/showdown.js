// The end of a hand: what each hand nets when he folds, and at showdown against every hand of his that is left.
import { apart, faces, tally } from './reach.js';

/** What the hero wins when he wins the pot, loses when he loses it, and nets in a tie. */
function payoffs(g, node, me) {
  const half = g.pot0 / 2;
  return { win: half + node.invested[1 - me], lose: -(half + node.invested[me]), tie: (node.invested[1 - me] - node.invested[me]) / 2 };
}

export function foldValues(g, node, { me, heroes, villains, reach }) {
  const out = new Float64Array(g.N);
  const folder = g.nodes[node.parent].seat === 'oop' ? 0 : 1;
  const { win, lose } = payoffs(g, node, me);
  const net = folder === me ? lose : win;
  const t = tally(g, reach, villains);
  for (const h of heroes) out[h] = net * faces(g, t, reach, h);
  return out;
}

/** Each combination's strength on a five-card board (0 where it shares a card with the board). */
function strengths(g, board) {
  const { A, B, N, fs } = g;
  const s = new Float64Array(N); const five = board.slice(0, 5);
  for (let c = 0; c < N; c++) if (!five.includes(A[c]) && !five.includes(B[c])) s[c] = fs.evaluateCards([...five, A[c], B[c]]);
  return s;
}

/** A running tally of his hands, taken in order of strength up to a limit. */
const runningTally = () => ({ all: 0, per: new Float64Array(52), next: 0 });
function addHand(g, t, v, reach) { const w = reach[v]; t.all += w; t.per[g.A[v]] += w; t.per[g.B[v]] += w; }

/**
 * At showdown on the river: the hero's hands and his, each sorted by strength, walked up together; two running tallies,
 * of his hands below the hand and of those up to it, give what each hand beats and ties.
 */
export function showdownValues(g, node, { board, me, heroes, villains, reach, ctx }) {
  const out = new Float64Array(g.N);
  const { win, lose, tie } = payoffs(g, node, me);
  const s = ctx.strength ?? (ctx.strength = strengths(g, board));
  const hs = heroes.slice().sort((p, q) => s[p] - s[q]); const vs = villains.filter((v) => reach[v] > 0).sort((p, q) => s[p] - s[q]);
  const below = runningTally(); const upto = runningTally(); const t = tally(g, reach, vs);
  for (const h of hs) {
    const sh = s[h];
    while (below.next < vs.length && s[vs[below.next]] < sh) addHand(g, below, vs[below.next++], reach);
    while (upto.next < vs.length && s[vs[upto.next]] <= sh) addHand(g, upto, vs[upto.next++], reach);
    const beats = apart(g, below, h);
    const ties = apart(g, upto, h) + reach[h] - beats;
    out[h] = win * beats + tie * ties + lose * (faces(g, t, reach, h) - beats - ties);
  }
  return out;
}
