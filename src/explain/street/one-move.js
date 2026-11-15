/**
 * One move ahead, against what he actually does (research/insight/FREQUENCIES.md: this rule, with the next street read the
 * same way, gives up about a twentieth of a percent of the pot on turns and rivers against the solver's own play).
 * For one hand at a decision, every action it has: how his range splits in answer, the hand's equity against each part,
 * and what that comes to in % of the pot, counted from now.
 *   fold 0;  call or check behind: equity of the pot as it will be, less the call;
 *   bet, raise or check in front: he folds (the pot is won), he continues (equity against those hands, less what went in),
 *   he bets or raises (the better of folding and calling).
 */
import { cardsOf } from '../../combos.js';
import { equityVs } from '../../solver/flopsolve.js';
import { study } from './study.js';
import { groupsOf } from './groups.js';
import { sharesCard } from './shared-cards.js';

/** The pot once both have put in `level`, from `me` and `him` in now. */
export const potAt = (pot, me, him, level) => pot + (level - me) + (level - him);

/** Everything about the decision and the hand that the count reads. */
function countFor(s, c) {
  const { fs, f } = s; const node = f.node; const mask = new Float64Array(fs.COMBOS); mask[c] = 1;
  const live = (r) => { let t = 0; for (let v = 0; v < fs.COMBOS; v++) if (r[v] > 0 && !sharesCard(fs, v, c)) t += r[v]; return t; };
  const equityVsRange = (r) => { const e = equityVs(fs, f.board, mask, r)[c]; return Number.isNaN(e) ? null : e; };
  return { s, fs, f, c, hand: cardsOf(fs, c), me: node.invested[f.me], him: node.invested[1 - f.me], pot: node.pot, live, equityVsRange };
}

/** An action that ends his part of the street: the hand's equity against all he has, of the pot as it will be. */
function showdownMove(k, out, to) {
  const { f, me, him, pot } = k;
  out.his = groupsOf(k.fs, f.board, f.his, k.hand); const e = k.equityVsRange(f.his);
  const total = potAt(pot, me, him, Math.max(to, him));
  out.equity = e; out.value = e == null ? 0 : e * total - out.paid; out.price = out.paid > 0 ? out.paid / total : 0;
  return out;
}

/** What one of his answers is worth to the hand: the pot when he folds, its equity when he calls, the better of folding and calling when he raises. */
function answerValue(k, part, after, to, paid) {
  const { me, him, pot } = k; const hisTo = after.invested ? after.invested[1 - k.f.me] : him; const e = part.equity;
  if (part.kind === 'fold') { part.value = pot; return; }
  if (part.kind === 'check' || part.kind === 'call') { part.value = (e ?? 0) * potAt(pot, me, him, Math.max(to, hisTo)) - paid; return; }
  const callValue = (e ?? 0) * potAt(pot, me, him, hisTo) - (hisTo - me);
  part.calls = callValue > -paid; part.value = Math.max(-paid, callValue);
}

function answersTo(k, out, edge, to, all) {
  const { s, fs, f } = k; const child = f.nodes[edge.child];
  const s2 = study(fs, s.solution, f.nodes, edge.child, s.dealt ?? []); if (!s2) return out;
  child.edges.forEach((reply, b) => {
    const r = new Float64Array(fs.COMBOS); for (let v = 0; v < fs.COMBOS; v++) if (f.his[v] > 0) r[v] = f.his[v] * s2.sigma(v, b);
    const share = k.live(r) / all; if (share <= 0.0005) return;
    const part = { kind: reply.kind, label: reply.label, share, equity: k.equityVsRange(r), groups: groupsOf(fs, f.board, r, k.hand) };
    answerValue(k, part, f.nodes[reply.child], to, out.paid);
    out.parts.push(part); out.value += share * part.value;
  });
  return out;
}

function moveOf(k, edge, a, all) {
  const child = k.f.nodes[edge.child]; const to = child.invested ? child.invested[k.f.me] : k.me; const paid = to - k.me;
  const out = { kind: edge.kind, label: edge.label, sigma: k.s.sigma(k.c, a), paid, parts: [], value: 0 };
  if (edge.kind === 'fold') return out;
  if (child.kind !== 'decision') return showdownMove(k, out, to);
  return answersTo(k, out, edge, to, all);
}

export function oneMove(s, c) {
  const { f } = s; if (!s.solution || !(f.mine[c] > 0)) return null;
  const k = countFor(s, c); const all = k.live(f.his); if (!(all > 0)) return null;
  const actions = f.node.edges.map((edge, a) => moveOf(k, edge, a, all));
  for (const x of actions) { x.chips = x.value; x.value = (100 * x.value) / k.pot; }
  return { actions, pot: k.pot };
}
