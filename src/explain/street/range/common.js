// What the range sentences share: the part of a range that takes some actions, and how a bet is named.
import { groupsOf } from '../groups.js';
import { percent } from '../words.js';

/** The part of a studied range that takes the actions `pick(kind, action)` chooses: each hand's weight times how often it does. */
export function takingRange(st, pick) {
  const r = new Float64Array(st.fs.COMBOS);
  for (let c = 0; c < st.fs.COMBOS; c++) {
    if (!(st.f.mine[c] > 0)) continue;
    let p = 0; st.f.node.edges.forEach((e, a) => { if (pick(e.kind, a)) p += st.sigma(c, a); }); r[c] = st.f.mine[c] * p;
  }
  return r;
}

/** His answer to our action, at his decision `st`: how much of his range gives it, and what those hands are. */
export function answerOf(board, st, pick) {
  const r = takingRange(st, pick); let t = 0, w = 0;
  for (let v = 0; v < st.fs.COMBOS; v++) if (st.f.mine[v] > 0) { t += r[v]; w += st.f.mine[v]; }
  return { share: w > 0 ? t / w : 0, groups: groupsOf(st.fs, board, r), range: r };
}

/** "flush draws 23%, top pair 18%": the first `n` kinds of a range with their shares. */
export const groupShares = (groups, n) => groups.slice(0, n).map((g) => `${g.name} ${percent(g.share)}`).join(', ');

/** An action in words, for the range sentences. */
export function betName(edge) {
  const n = /\d+/.exec(edge.label)?.[0];
  return edge.kind === 'allin' ? 'an all-in' : edge.kind === 'raise' ? 'a raise' : n ? `the ${n}% bet` : 'a bet';
}
