/**
 * What can be said about one hand, as claims: each a statement with the numbers it commits to.
 * `holds(claim, measure)` says whether a claim is true of the same hand measured in another
 * solve; the proof harness requires every claim made at page accuracy to hold in both references.
 *
 * Two sorts of claim, and they are held to different things.
 *
 * A NUMBER is a fact of the solution on screen: his fold frequency in it, the hand's equity against
 * the range he arrives with in it, what an action is worth against his strategy in it. These are
 * exact by construction (the accounting proofs) and are worded as being about this solution.
 * Another equally good solution of the same spot can differ: where and by how much is measured.
 *
 * A CONCLUSION is drawn from the numbers and is meant to be true of the spot, not of one solve.
 * It is made only where it has held, without exception, in two far finer solves of every spot
 * it has been tried on:
 *   worse   { best, a, gap }      action a, which the hand does not take, is worse than its best action
 *                                 (how much worse is a number: only that it is worse carries over)
 *   same    { a, b, within }      two actions the hand takes are worth the same to within `within`
 *   needs   { a, passive, by }    the times he continues against bet a are worth less to the hand than the
 *                                 passive action is overall: the bet earns through his folds
 *   builds  { a, passive, by }    they are worth more: the bet does not depend on his folding
 *   cards   { a, n, lift, rest }  a call's gain over folding, on the n cards that lift the hand and on the others
 *   role    { band, other, more } the hand's fifth of the range (by strength) bets, or continues, more (or less) than
 *                                 another fifth does, by at least T.role in this solve
 * The last four are made only about actions the hand itself takes (`TAKES` of the time or more).
 */
import { isWager } from './words.js';

/** Below this share of either range, a line is too rare for the solution to mean anything on it. */
export const RARE = 0.05;
/**
 * A hand takes an action when it does so at least this often. What an action is worth to a hand that takes it is pinned
 * down far better than to one that does not.
 */
export const TAKES = 0.1;

/** The actions on the path that have a worth for this hand. */
const onPath = (m) => m.actions.map((a, i) => (a.on && a.worth != null ? i : -1)).filter((i) => i >= 0);
const bestOf = (m, on) => on.reduce((b, i) => (b < 0 || m.actions[i].worth > m.actions[b].worth ? i : b), -1);

/** A call's gain over folding, on the cards that lift the hand and on the others. */
const cardsGain = (cards, foldWorth) => ({ lift: cards.lift.part - foldWorth * cards.lift.weight, rest: cards.rest.part - foldWorth * cards.rest.weight });

function sameClaims(m, T, on) {
  const out = []; const worth = (i) => m.actions[i].worth; const played = on.filter((i) => m.actions[i].sigma >= TAKES);
  for (let x = 0; x < played.length; x++) {
    for (let y = x + 1; y < played.length; y++) {
      const d = Math.abs(worth(played[x]) - worth(played[y])); if (d <= T.gap / 2) out.push({ kind: 'same', a: played[x], b: played[y], within: d + T.gap });
    }
  }
  return out;
}

function worthClaims(m, T, on, best) {
  if (T.gap == null || on.length <= 1) return [];
  const out = [];
  for (const i of on) {
    if (i === best) continue;
    const gap = m.actions[best].worth - m.actions[i].worth; if (T.sign != null && gap >= T.sign) out.push({ kind: 'worse', best, a: i, gap });
  }
  return [...out, ...sameClaims(m, T, on)];
}

/** Where the hand sits: its fifth of the range against the fifth that does the opposite most. */
function roleClaims(m, T) {
  if (!(m.bands && m.band >= 0 && T.role != null)) return [];
  const mine = m.bands[m.band].move; const apart = (k) => Math.abs(m.bands[k].move - mine); let other = -1;
  m.bands.forEach((b, k) => { if (k !== m.band && b.weight > 0 && (other < 0 || Math.abs(b.move - mine) > apart(other))) other = k; });
  if (!(other >= 0 && apart(other) >= T.role)) return [];
  return [{ kind: 'role', band: m.band, other, more: mine > m.bands[other].move, mine, theirs: m.bands[other].move }];
}

/** A bet or raise: how often he folds to it, and whether the times he continues are worth more or less than the passive action. */
function foldClaims(m, T, i, passive) {
  const a = m.actions[i];
  if (!isWager(a.kind) || a.folds == null) return [];
  const out = [{ kind: 'folds', a: i, value: a.folds, number: true }];
  if (!(T.cmp != null && passive != null && a.sigma >= TAKES && a.continues >= 0.05 && a.whenContinued != null)) return out;
  const d = a.whenContinued - m.actions[passive].worth;
  if (d <= -2 * T.cmp) out.push({ kind: 'needs', a: i, passive, by: -d });
  else if (d >= 2 * T.cmp) out.push({ kind: 'builds', a: i, passive, by: d });
  return out;
}

/** A call: which cards it is for. Each half is concluded only when it is clear of zero by twice its tolerance. */
function cardsClaims(m, T, i) {
  const a = m.actions[i]; const fold = m.actions.findIndex((x) => x.kind === 'fold');
  const calls = a.kind === 'call' && a.sigma >= TAKES && a.cards && a.cards.lift.n > 0;
  if (!(calls && fold >= 0 && m.actions[fold].worth != null && T.lift != null)) return [];
  const { lift, rest } = cardsGain(a.cards, m.actions[fold].worth);
  const liftSure = Math.abs(lift) >= 2 * T.lift; const restSure = T.rest != null && Math.abs(rest) >= 2 * T.rest;
  if (!(liftSure || restSure)) return [];
  const { lift: up, rest: down } = a.cards;
  return [{ kind: 'cards', a: i, fold, n: up.n, others: down.n, lift, rest, liftSure, restSure, liftWeight: up.weight, restWeight: down.weight }];
}

export function claims(s, m, T) {
  if (!m || !T) return [];
  const on = onPath(m); const best = bestOf(m, on);
  const out = [{ kind: 'equity', value: m.equity, number: true }, ...worthClaims(m, T, on, best), ...roleClaims(m, T)];
  const passive = on.find((i) => m.actions[i].kind === 'check' || m.actions[i].kind === 'call');
  for (const i of on) out.push(...foldClaims(m, T, i, passive), ...cardsClaims(m, T, i));
  return out;
}

function cardsHold(claim, A) {
  const c = A[claim.a].cards; if (!c) return false;
  const { lift, rest } = cardsGain(c, A[claim.fold].worth);
  return (!claim.liftSure || Math.sign(lift) === Math.sign(claim.lift)) && (!claim.restSure || Math.sign(rest) === Math.sign(claim.rest));
}

function roleHolds(claim, bands) {
  const mine = bands[claim.band].move; const theirs = bands[claim.other].move;
  return claim.more ? mine > theirs : mine < theirs;
}

/** Is a claim true of the same hand as measured in another solve? */
export function holds(claim, m, T) {
  const A = m.actions;
  switch (claim.kind) {
    case 'equity': return Math.abs(m.equity - claim.value) <= T.eq / 100;
    case 'folds': return A[claim.a].folds != null && Math.abs(A[claim.a].folds - claim.value) <= T.folds / 100;
    case 'role': return !!m.bands && roleHolds(claim, m.bands);
    case 'worse': return A[claim.best].worth - A[claim.a].worth > 0;
    case 'same': return Math.abs(A[claim.a].worth - A[claim.b].worth) <= claim.within;
    // the conclusion is the direction; how far is a number of the solution it was read from
    case 'needs': return A[claim.a].whenContinued != null && A[claim.a].whenContinued - A[claim.passive].worth < 0;
    case 'builds': return A[claim.a].whenContinued != null && A[claim.a].whenContinued - A[claim.passive].worth > 0;
    case 'cards': return cardsHold(claim, A);
    default: return false;
  }
}
