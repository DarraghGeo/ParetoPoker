// The derived formulas as a strategy: how often to bet and with which hands, how often to fold and with which hands.
// Nothing here is fitted, and nothing is solved. See FREQUENCIES.md for where each rule comes from.
import * as fs from 'poker-flopsolve';
import { equityVs } from '../../src/solver/flopsolve.js';
const N = fs.COMBOS; const CA = (c) => fs.COMBO_CARDS[2 * c]; const CB = (c) => fs.COMBO_CARDS[2 * c + 1];

// ---- a range as a curve -------------------------------------------------------------------------------------------
export function dist(values, weights, ids) {
  const order = ids.filter((c) => weights[c] > 0 && !Number.isNaN(values[c])).sort((x, y) => values[x] - values[y]);
  const e = order.map((c) => values[c]); const w = order.map((c) => weights[c]); const cum = []; let t = 0; for (const x of w) { t += x; cum.push(t); }
  const below = (v) => { let s = 0; for (let i = 0; i < e.length && e[i] < v; i++) s += w[i]; return t > 0 ? s / t : 0; };
  const quantile = (q) => { if (!e.length) return 0; const target = q * t; let lo = 0, hi = e.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] >= target) hi = m; else lo = m + 1; } return e[lo]; };
  return { e, w, total: t, below, quantile, order };
}
/** The base thresholds, by how much of the range bets for value, with `rho` bluffs for every value bet. */
export function base(G, s, rho) {
  let lo = 0, hi = 1 / (1 + rho);
  for (let k = 0; k < 40; k++) { const v = (lo + hi) / 2; const b = G.quantile(1 - v); const a = v > 0 ? G.quantile(Math.min(1, rho * v)) : 0; if (b - (1 + (s + a) / (1 + s)) / 2 > 0) lo = v; else hi = v; }
  const v = (lo + hi) / 2; const a = v > 0 ? G.quantile(Math.min(1, rho * v)) : 0; return { v, fold: Math.min(1, (s + a) / (1 + s)) };
}
/** First to act, where a check is not a showdown (derive.py, A). */
export function outOfPosition(G, s) {
  const rho = s / (1 + s); const Q = G.quantile; const F = G.below;
  const inner = (v) => {
    const b1 = v > 1e-9 ? Q(1 - v) : 1; const beta = rho * v; const xa = beta > 0 ? Q(beta) : 0; const top = 1 - v; const chk = Math.max(1e-9, top - beta); let a2 = 0, b2 = 1;
    for (let k = 0; k < 30; k++) { const v2 = Math.max(0, F(a2) - beta) / chk; const fold = Math.min(1, (s + v2) / (1 + s)); const gk = beta + fold * chk; const b2n = Q((gk + top) / 2); const a2n = (1 - b2n) * rho; a2 = (a2 + a2n) / 2; b2 = (b2 + b2n) / 2; }
    return { b1, xa, a2, b2 };
  };
  const checked = (x, a2, b2) => { const show = Math.min(Math.max(x, a2), b2) - a2; return Math.max(show, show + a2 * (1 + s) + Math.max(0, x - b2) * (1 + s) - (1 - Math.max(x, b2)) * s); };
  const gap = (v) => { const { b1, xa, a2, b2 } = inner(v); const c1 = Math.min(1, (s + checked(xa, a2, b2)) / (1 + s)); return { g: c1 + Math.max(0, b1 - c1) * (1 + s) - (1 - Math.max(b1, c1)) * s - checked(b1, a2, b2), c1 }; };
  let lo = 0, hi = 1 / (1 + rho); for (let k = 0; k < 40; k++) { const v = (lo + hi) / 2; if (gap(v).g > 0) lo = v; else hi = v; }
  const v = (lo + hi) / 2; return { v, fold: gap(v).c1 };
}
/** Share of his range each hand beats on the board as it stands (ties half), his hands that share a card left out. */
export function beatsNow(board, mine, his, ids) {
  const strength = new Float64Array(N); const all = ids.filter((c) => mine[c] > 0 || his[c] > 0); for (const c of all) strength[c] = fs.evaluateCards([...board, CA(c), CB(c)]);
  const out = new Float64Array(N).fill(NaN); const theirs = all.filter((c) => his[c] > 0);
  for (const h of all) { if (!(mine[h] > 0)) continue; let w = 0, t = 0; const a = CA(h), b = CB(h); for (const v of theirs) { if (CA(v) === a || CA(v) === b || CB(v) === a || CB(v) === b) continue; w += his[v]; t += his[v] * (strength[h] > strength[v] ? 1 : strength[h] === strength[v] ? 0.5 : 0); } if (w > 0) out[h] = t / w; }
  return out;
}
/**
 * Give `amount` of the range (in weight) to the hands in `order`, each up to what it has free; hands level on `key`
 * share alike, so that hands the board cannot tell apart play the same. `cost`: what a unit of a hand's weight uses up
 * of the amount (1 unless said). Returns per-hand shares.
 */
export function fill(order, weights, amount, taken, key = null, cost = null) {
  const out = new Float64Array(N); let left = amount; let i = 0;
  while (i < order.length && left > 1e-12) {
    let j = i + 1; if (key) while (j < order.length && Math.abs(key[order[j]] - key[order[i]]) < 1e-9) j++;
    let need = 0; for (let k = i; k < j; k++) { const c = order[k]; need += weights[c] * (1 - (taken ? taken[c] : 0)) * (cost ? cost[c] : 1); }
    const part = need <= left ? 1 : left / need;
    for (let k = i; k < j; k++) { const c = order[k]; out[c] = part * (1 - (taken ? taken[c] : 0)); }
    left -= Math.min(need, left); i = j;
  }
  return out;
}

// ---- the formulas, as a strategy ------------------------------------------------------------------------------------
/**
 * The player to act may check or bet `s` pots. Returns each hand's chance of betting, and how much of the other range
 * the formulas expect to fold (which the other player then does).
 */
export function betting(kind, board, mine, his, ids, s, first, river) {
  const live = ids.filter((c) => mine[c] > 0); const W = live.reduce((t, c) => t + mine[c], 0); const rho = s / (1 + s);
  const e = equityVs(fs, board, mine, his); const bet = new Float64Array(N);
  if (!W) return { bet, fold: rho };
  if (kind === 'equity') {
    // for scale: the one-street thresholds on equity, at every street and seat (the base as it stood before any of this work)
    const G = dist(e, mine, live); const t = base(G, s, rho); const strong = [...G.order].reverse(); const value = fill(strong, mine, t.v * W, null, e); const bluff = fill(G.order, mine, rho * t.v * W, value, e);
    for (const c of live) bet[c] = Math.min(1, value[c] + bluff[c]); return { bet, fold: t.fold };
  }
  const now = river ? e : beatsNow(board, mine, his, ids); const G = dist(now, mine, live); const t = first ? outOfPosition(G, s) : base(G, s, rho);
  const strong = [...G.order].reverse(); const value = fill(strong, mine, t.v * W, null, now);
  if (river) { const bluff = fill(G.order, mine, rho * t.v * W, value, now); for (const c of live) bet[c] = Math.min(1, value[c] + bluff[c]); return { bet, fold: t.fold }; }
  // before the river: a called bluff still wins q of the time, and counts as 1 - q(1+2s)/(1+s) of a bluff (derive5.py)
  const order = dist(e, his, ids.filter((c) => his[c] > 0)); const hisEq = equityVs(fs, board, his, mine); const top = new Float64Array(N); { const ranked = ids.filter((c) => his[c] > 0 && !Number.isNaN(hisEq[c])).sort((x, y) => hisEq[y] - hisEq[x]); let seen = 0; const all = ranked.reduce((u, c) => u + his[c], 0); for (const c of ranked) { if (seen >= all / 3) break; top[c] = his[c]; seen += his[c]; } }
  const eTop = equityVs(fs, board, mine, top); const c = Math.min(0.99, t.fold); const calls = 1 - c; void order;
  const q = (h) => { const lo = Number.isNaN(eTop[h]) ? e[h] : eTop[h]; return Math.min(1, Math.max(0, calls > 1 / 3 ? lo + (e[h] - lo) * (calls - 1 / 3) / (2 / 3) : lo)); };
  const gain = (h) => c + (1 - c) * (q(h) * (1 + 2 * s) - s) - now[h];
  const g = new Float64Array(N); const cost = new Float64Array(N).fill(1); const rest = live.filter((h) => !Number.isNaN(now[h])); for (const h of rest) { g[h] = Math.round(gain(h) * 1e7) / 1e7; cost[h] = Math.min(1, Math.max(0.05, 1 - q(h) * (1 + 2 * s) / (1 + s))); }
  rest.sort((x, y) => g[y] - g[x]); const bluff = fill(rest, mine, rho * t.v * W, value, g, cost); for (const h of rest) bet[h] = bluff[h];
  for (const h of live) bet[h] = Math.min(1, bet[h] + value[h]);
  return { bet, fold: t.fold };
}
/** Facing a bet: fold the given share of the range, the hands with the least equity. Returns each hand's chance of folding. */
export function folding(kind, board, mine, his, ids, share, s) {
  const live = ids.filter((c) => mine[c] > 0); const W = live.reduce((t, c) => t + mine[c], 0); const e = equityVs(fs, board, mine, his);
  const order = live.filter((c) => !Number.isNaN(e[c])).sort((x, y) => e[x] - e[y]);
  return fill(order, mine, (kind === 'price' ? s / (1 + s) : share) * W, null, e);
}

