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


// ---- any bet sizes, any raises ---------------------------------------------------------------------------------------
/**
 * The player to act may check or bet any of `sizes` (in pots). Derived as the one-size thresholds are:
 *   - one weakest bluff is indifferent between checking and every size, so he folds c_i = (s_i + u)/(1 + s_i) to size i,
 *     u what that bluff is worth checked;
 *   - a hand that beats x of his range earns x(1 + 2 s_i) - s_i(1 + c_i) betting size i for value, and takes the best of
 *     those and checking: stronger hands, bigger bets;
 *   - each size has s_i/(1 + s_i) bluffs for every value bet of that size.
 * Out of position a check is not a showdown: it is worth what the check game gives it (he bets `after` pots).
 * Before the river the ruler is what the hand beats now, and a bluff counts by its equity when called.
 * Returns each hand's chance of each size (`bets[i][combo]`) and what folds to each (`folds[i]`).
 */
export function acting(board, mine, his, ids, sizes, first, river, after = 0.75) {
  const live = ids.filter((c) => mine[c] > 0); const W = live.reduce((t, c) => t + mine[c], 0); const n = sizes.length; const bets = sizes.map(() => new Float64Array(N));
  if (!W || !n) return { bets, folds: sizes.map((s) => s / (1 + s)) };
  const e = equityVs(fs, board, mine, his); const x = river ? e : beatsNow(board, mine, his, ids); const hands = live.filter((c) => !Number.isNaN(x[c])); const G = dist(x, mine, hands); const rho = sizes.map((s) => s / (1 + s));
  let checked = (v) => v;   // what a hand that beats v of his range is worth checked, in pots
  let pick = null; let folds = null;
  const solve = () => {
    let lo = 0, hi = 1; let best = null;
    for (let k = 0; k < 30; k++) {
      const u = (lo + hi) / 2; const c = sizes.map((s) => Math.min(1, (s + u) / (1 + s))); const choice = new Int8Array(N).fill(-1); const V = sizes.map(() => 0);
      for (const h of hands) { let top = checked(x[h]), at = -1; for (let i = 0; i < n; i++) { const v = x[h] * (1 + 2 * sizes[i]) - sizes[i] * (1 + c[i]); if (v > top + 1e-12) { top = v; at = i; } } choice[h] = at; if (at >= 0) V[at] += mine[h]; }
      const need = V.reduce((t, v, i) => t + rho[i] * v, 0) / W; const xa = need > 0 ? G.quantile(Math.min(1, need)) : 0; const got = checked(xa);
      best = { u, c, choice, V, need }; if (got > u) lo = u; else hi = u;
    }
    return best;
  };
  let sol = solve();
  if (first) {
    // the check game: what he does after our check, from how much of our range bets for value and as a bluff
    for (let pass = 0; pass < 4; pass++) {
      const v = sol.V.reduce((t, y) => t + y, 0) / W; const beta = Math.min(1 - v, sol.need); const top = 1 - v; const chk = Math.max(1e-9, top - beta); const s = after; const r = s / (1 + s); let a2 = 0, b2 = 1;
      for (let k = 0; k < 30; k++) { const v2 = Math.max(0, G.below(a2) - beta) / chk; const fold = Math.min(1, (s + v2) / (1 + s)); const gk = beta + fold * chk; const b2n = G.quantile(Math.min(1, (gk + top) / 2)); const a2n = (1 - b2n) * r; a2 = (a2 + a2n) / 2; b2 = (b2 + b2n) / 2; }
      const A2 = a2, B2 = b2; checked = (y) => { const show = Math.min(Math.max(y, A2), B2) - A2; return Math.max(show, show + A2 * (1 + s) + Math.max(0, y - B2) * (1 + s) - (1 - Math.max(y, B2)) * s); };
      sol = solve();
    }
  }
  pick = sol.choice; folds = sol.c; const value = new Float64Array(N); for (const h of hands) if (pick[h] >= 0) { bets[pick[h]][h] = 1; value[h] = 1; }
  // the bluffs: the biggest size first. On the river the weakest hands; before it, the hands that gain most, each counted by its equity when called
  let order; let q = null;
  if (river) order = [...G.order];
  else {
    const hisEq = equityVs(fs, board, his, mine); const top = new Float64Array(N); { const ranked = ids.filter((c) => his[c] > 0 && !Number.isNaN(hisEq[c])).sort((y, z) => hisEq[z] - hisEq[y]); let seen = 0; const all = ranked.reduce((t, c) => t + his[c], 0); for (const c of ranked) { if (seen >= all / 3) break; top[c] = his[c]; seen += his[c]; } }
    const eTop = equityVs(fs, board, mine, top); const mid = sizes[n >> 1]; const c = Math.min(0.99, folds[n >> 1]); const calls = 1 - c;
    q = new Float64Array(N); const g = new Float64Array(N); for (const h of hands) { const lo = Number.isNaN(eTop[h]) ? e[h] : eTop[h]; q[h] = Math.min(1, Math.max(0, calls > 1 / 3 ? lo + (e[h] - lo) * (calls - 1 / 3) / (2 / 3) : lo)); g[h] = Math.round((c + (1 - c) * (q[h] * (1 + 2 * mid) - mid) - x[h]) * 1e7) / 1e7; }
    order = [...hands].sort((y, z) => g[z] - g[y]); order.key = g;
  }
  const taken = Float64Array.from(value);
  for (let i = n - 1; i >= 0; i--) {
    const budget = rho[i] * sol.V[i]; if (budget <= 0) continue; let cost = null; if (q) { cost = new Float64Array(N).fill(1); for (const h of hands) cost[h] = Math.min(1, Math.max(0.05, 1 - q[h] * (1 + 2 * sizes[i]) / (1 + sizes[i]))); }
    const share = fill(order, mine, budget, taken, river ? x : order.key, cost); for (const h of hands) if (share[h] > 0) { bets[i][h] += share[h]; taken[h] = Math.min(1, taken[h] + share[h]); }
  }
  return { bets, folds };
}
/**
 * Facing a bet or a raise. `foldShare`: how much of the range the other player's bluffs need to fold. `raise`: the raise
 * on offer, as { add, pot, toCall } in chips (what the raise puts in, the pot as it stands with his wager in it, and
 * what a call costs), or null. Derived as the bet is:
 *   - a bluff raise risks `add` to win the pot, so his range must fold f = add/(add + pot) to it;
 *   - his bluff-catcher calls (add - toCall) to win pot + add, so bluff raises are price/(1 - price) of the value raises;
 *   - a value raise beats half of what calls it: it beats (1 + f)/2 of the range that bet.
 * The share that folds is the hands with the least equity; before the river the bluff raises are the hands with the
 * most equity against his strong hands (the draws), each counted by that equity.
 * Returns each hand's chance of folding and raising, and what the raise expects to fold.
 */
export function facing(board, mine, his, ids, foldShare, raise, river) {
  const live = ids.filter((c) => mine[c] > 0); const W = live.reduce((t, c) => t + mine[c], 0); const fold = new Float64Array(N); const up = new Float64Array(N);
  if (!W) return { fold, up, expect: null };
  const e = equityVs(fs, board, mine, his); const hands = live.filter((c) => !Number.isNaN(e[c])); let expect = null;
  if (raise) {
    const f = raise.add / (raise.add + raise.pot); const price = (raise.add - raise.toCall) / (raise.pot + 2 * raise.add - raise.toCall); const ratio = price / (1 - price); expect = f;
    const x = river ? e : beatsNow(board, mine, his, ids); const need = (1 + f) / 2; let V = 0; for (const h of hands) if (!Number.isNaN(x[h]) && x[h] >= need) { up[h] = 1; V += mine[h]; }
    // never more than the range can spare: what continues is what does not fold
    const room = Math.max(0, (1 - foldShare) * W - V); const budget = Math.min(ratio * V, room);
    if (budget > 0) {
      const r = raise.add / raise.pot;
      if (river) { // the best of the hands that would fold: just under where the calls start
        const order = hands.filter((h) => !up[h]).sort((y, z) => e[y] - e[z]); const skip = fill(order, mine, Math.max(0, foldShare * W - budget), up, e); const share = fill(order, mine, budget, skip, e); for (const h of hands) up[h] = Math.min(1, up[h] + share[h]); }
      else {
        const hisEq = equityVs(fs, board, his, mine); const top = new Float64Array(N); { const ranked = ids.filter((c) => his[c] > 0 && !Number.isNaN(hisEq[c])).sort((y, z) => hisEq[z] - hisEq[y]); let seen = 0; const all = ranked.reduce((t, c) => t + his[c], 0); for (const c of ranked) { if (seen >= all / 3) break; top[c] = his[c]; seen += his[c]; } }
        const eTop = equityVs(fs, board, mine, top); const key = new Float64Array(N); const cost = new Float64Array(N).fill(1); for (const h of hands) { const qh = Number.isNaN(eTop[h]) ? 0 : eTop[h]; key[h] = Math.round(qh * 1e7) / 1e7; cost[h] = Math.min(1, Math.max(0.05, 1 - qh * (1 + 2 * r) / (1 + r))); }
        const order = hands.filter((h) => !up[h]).sort((y, z) => key[z] - key[y]); const share = fill(order, mine, budget, up, key, cost); for (const h of hands) up[h] = Math.min(1, up[h] + share[h]);
      }
    }
  }
  const order = [...hands].sort((y, z) => e[y] - e[z]); const share = fill(order, mine, foldShare * W, up, e); for (const h of hands) fold[h] = share[h];
  return { fold, up, expect };
}

// ---- how much of a range bets before the river: denial -------------------------------------------------------------------
/**
 * Why a range of middling hands bets more than the thresholds say, and less into a polarised range. On the river a hand
 * that makes him fold gains nothing from it unless it was behind: the hands that fold had no equity. Before the river
 * they do. A hand that bets `s` pots, is folded to c of the time, has e_f against the hands that fold and e_c against
 * the hands that continue, and would have had its whole equity by checking, gains by betting
 *       c (1 - e_f)  -  s (1 - c)(1 - 2 e_c)
 * the equity it takes from the hands that fold, less what it pays the hands that continue when it is behind them.
 * On the river e_f is 1 for a hand ahead and this is the rule "beat half of what calls". Before it, a hand behind the
 * callers still bets when the folders had enough equity against it: many of them when his range is middling, few when
 * it is nuts or air.
 * He calls with the top (1 - c) of his range, and c is where his weakest call is indifferent: its equity against the
 * hands that bet is the price, s/(1 + 2s). One unknown, found by a search; everything else is equities.
 * His range is cut into `K` parts by strength, and our equity against each part is worked out once.
 * Returns the share of the range that bets, and c.
 */
export function denial(board, mine, his, ids, s, K = 8) {
  const live = ids.filter((c) => mine[c] > 0); const W = live.reduce((t, c) => t + mine[c], 0); if (!W) return null;
  const hisEq = equityVs(fs, board, his, mine); const ranked = ids.filter((c) => his[c] > 0 && !Number.isNaN(hisEq[c])).sort((x, y) => hisEq[x] - hisEq[y]); const all = ranked.reduce((t, c) => t + his[c], 0); if (!all) return null;
  // his range in K parts of equal weight, weakest first, and our equity against each
  const parts = Array.from({ length: K }, () => new Float64Array(N)); let seen = 0; for (const c of ranked) { let left = his[c]; while (left > 1e-12) { const k = Math.min(K - 1, Math.floor((seen / all) * K + 1e-9)); const room = ((k + 1) / K) * all - seen; const take = k === K - 1 ? left : Math.min(left, Math.max(room, 1e-12)); parts[k][c] += take; seen += take; left -= take; } }
  const E = parts.map((p) => equityVs(fs, board, mine, p)); const hands = live.filter((c) => E.every((x) => !Number.isNaN(x[c])));
  const price = s / (1 + 2 * s);
  const at = (c) => {
    // weights of each part among the hands that fold (below c) and that continue (above)
    const lo = E.map((_, k) => Math.max(0, Math.min(c, (k + 1) / K) - k / K)); const hi = E.map((_, k) => 1 / K - lo[k]); const sl = lo.reduce((t, x) => t + x, 0); const sh = hi.reduce((t, x) => t + x, 0);
    let mass = 0; const pos = Math.min(K - 1.0001, Math.max(0, c * K - 0.5)); const k0 = Math.floor(pos); const frac = pos - k0; let caller = 0;
    const bets = [];
    for (const h of hands) {
      let ef = 0, ec = 0; for (let k = 0; k < K; k++) { ef += lo[k] * E[k][h]; ec += hi[k] * E[k][h]; } ef = sl > 0 ? ef / sl : 1; ec = sh > 0 ? ec / sh : 0;
      if (c * (1 - ef) - s * (1 - c) * (1 - 2 * ec) > 0) { bets.push(h); mass += mine[h]; caller += mine[h] * ((1 - frac) * E[k0][h] + frac * E[Math.min(K - 1, k0 + 1)][h]); }
    }
    return { share: mass / W, callerEquity: mass > 0 ? 1 - caller / mass : 0, bets };
  };
  let lo = 0, hi = 1; for (let i = 0; i < 24; i++) { const c = (lo + hi) / 2; if (at(c).callerEquity > price) hi = c; else lo = c; }
  const c = (lo + hi) / 2; const t = at(c); return { share: t.share, fold: c, bets: t.bets };
}
