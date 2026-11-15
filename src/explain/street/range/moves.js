/**
 * The one-move rule for every hand of the range at once (see `oneMove`): what each action is worth to each hand, in chips
 * counted from now, against what he actually does. `what`: a change to try, to see what the range would do otherwise.
 *   noRaise   he may not raise: the hands he raises with call instead
 *   noStab    he may not bet after our check: the hands he bets with check behind instead
 *   lastBet   (facing a bet) nothing more can be bet after this: a call is worth exactly its equity (this is the rule's
 *             own count; it is here to be set against what the solution does)
 * Returns { hands, values[action][combo], kinds, share(pick), lean(pick, margin) } where share is how much of the range does
 * best by an action of that kind (level within a hair counts for each).
 */
import { facingOf } from '../../../combos.js';
import { equityVs } from '../../../solver/flopsolve.js';
import { study } from '../study.js';
import { potAt } from '../one-move.js';
import { isWager } from '../words.js';

/** How much of a range each hand can face, never below nothing. */
const liveOf = (fs, range) => { const facing = facingOf(fs, range); return (c) => Math.max(0, facing(c)); };

/** One of his answers to an action, added to what that action is worth to each hand. */
function addAnswer(k, V, reply, r, to, paid) {
  const { f, me, him, pot } = k; const live = liveOf(k.fs, r); const after = f.nodes[reply.child];
  const hisTo = after.invested ? after.invested[1 - f.me] : him; const pushes = isWager(reply.kind); let e = null;
  // a wager of his that the change takes away is played as the quiet action instead
  const quiet = reply.kind === 'check' || reply.kind === 'call' || (pushes && ((k.what.noRaise && paid > 0) || (k.what.noStab && paid === 0)));
  for (const c of k.hands) {
    const all = k.liveAll(c); if (!(all > 0)) continue; const share = live(c) / all; if (share <= 0) continue;
    if (reply.kind === 'fold') { V[c] += share * pot; continue; }
    e ??= k.equityVsRange(r); const eq = Number.isNaN(e[c]) ? 0 : e[c];
    if (quiet) V[c] += share * (eq * potAt(pot, me, him, Math.max(to, pushes ? to : hisTo, him)) - paid);
    else V[c] += share * Math.max(-paid, eq * potAt(pot, me, him, hisTo) - (hisTo - me));
  }
}

function answersTo(k, V, edge, to, paid) {
  const { fs, f, s } = k; const s2 = study(fs, s.solution, f.nodes, edge.child, s.dealt ?? []); if (!s2) return V;
  f.nodes[edge.child].edges.forEach((reply, b) => {
    const r = new Float64Array(fs.COMBOS); let any = false;
    for (let v = 0; v < fs.COMBOS; v++) if (f.his[v] > 0) { r[v] = f.his[v] * s2.sigma(v, b); if (r[v] > 0) any = true; }
    if (any) addAnswer(k, V, reply, r, to, paid);
  });
  return V;
}

/** What one action is worth to each hand. */
function valuesOf(k, edge) {
  const { f, me, him, pot } = k; const child = f.nodes[edge.child]; const to = child.invested ? child.invested[f.me] : me; const paid = to - me;
  const V = new Float64Array(k.fs.COMBOS); if (edge.kind === 'fold') return V;
  if (child.kind === 'decision') return answersTo(k, V, edge, to, paid);
  const e = k.equityVsRange(f.his); const total = potAt(pot, me, him, Math.max(to, him));
  for (const c of k.hands) V[c] = Number.isNaN(e[c]) ? -paid : e[c] * total - paid;
  return V;
}

/** The actions that do best for a hand, level within a hair. */
function bestActions(values, kinds, pot, c) {
  let best = -Infinity; for (const v of values) best = Math.max(best, v[c]);
  const tol = 1e-9 + 0.002 * pot; return kinds.map((k, a) => a).filter((a) => values[a][c] >= best - tol);
}

/** How much of the range does best by an action `pick` chooses (actions level within a hair share the hand). */
function shareBy(f, hands, values, kinds, pot, W) {
  return (pick) => {
    let t = 0;
    for (const c of hands) { const top = bestActions(values, kinds, pot, c); t += f.mine[c] * top.filter((a) => pick(kinds[a], a)).length / top.length; }
    return W > 0 ? t / W : 0;
  };
}

/** By how much the best action `pick` chooses beats the best of the others, for a hand. */
function margin(values, kinds, pick, c) {
  let a = -Infinity, b = -Infinity; values.forEach((v, i) => { if (pick(kinds[i], i)) a = Math.max(a, v[c]); else b = Math.max(b, v[c]); });
  return a - b;
}

/** How much of the range clearly does better one way, how much the other, and how much is close (within `margin` of the pot). */
function leanBy(f, hands, values, kinds, pot, W) {
  return (pick, within = 0.015) => {
    let yes = 0, no = 0, close = 0;
    for (const c of hands) {
      const d = margin(values, kinds, pick, c); if (d > within * pot) yes += f.mine[c]; else if (d < -within * pot) no += f.mine[c]; else close += f.mine[c];
    }
    return { yes: yes / W, no: no / W, close: close / W };
  };
}

export function rangeMoves(s, what = {}) {
  const { fs, f } = s; if (!s.solution) return null; const node = f.node; const pot = node.pot;
  const hands = []; const mask = new Float64Array(fs.COMBOS); for (let c = 0; c < fs.COMBOS; c++) if (f.mine[c] > 0) { hands.push(c); mask[c] = 1; }
  const k = { s, fs, f, what, hands, me: node.invested[f.me], him: node.invested[1 - f.me], pot, liveAll: liveOf(fs, f.his),
    equityVsRange: (range) => equityVs(fs, f.board, mask, range) };
  const values = node.edges.map((edge) => valuesOf(k, edge)); const kinds = node.edges.map((e) => e.kind); const W = hands.reduce((t, c) => t + f.mine[c], 0);
  return { hands, values, kinds, share: shareBy(f, hands, values, kinds, pot, W), lean: leanBy(f, hands, values, kinds, pot, W), pot };
}
