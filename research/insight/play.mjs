// The test that matters: play the formulas, and measure what they lose.
//
// A whole strategy for both players is built from the derived formulas and nothing else (no solving): how often to bet
// and with which hands, how often to fold and with which hands, at every decision of a turn spot and all its rivers.
// It is written into the solver's own strategy store, and the solver computes exactly what a best response wins from
// it. The same is done with one seat playing the formulas and the other the solver's equilibrium, which gives each
// seat's own loss. Beside them, two cruder strategies for scale.
//   node play.mjs [spots] [seed-of-collection]     -> out/play.jsonl
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import * as fs from 'poker-flopsolve';
import { treeOf, equityVs } from '../../src/solver/flopsolve.js';
const N = fs.COMBOS; const CA = (c) => fs.COMBO_CARDS[2 * c]; const CB = (c) => fs.COMBO_CARDS[2 * c + 1];

// ---- a range as a curve -------------------------------------------------------------------------------------------
function dist(values, weights, ids) {
  const order = ids.filter((c) => weights[c] > 0 && !Number.isNaN(values[c])).sort((x, y) => values[x] - values[y]);
  const e = order.map((c) => values[c]); const w = order.map((c) => weights[c]); const cum = []; let t = 0; for (const x of w) { t += x; cum.push(t); }
  const below = (v) => { let s = 0; for (let i = 0; i < e.length && e[i] < v; i++) s += w[i]; return t > 0 ? s / t : 0; };
  const quantile = (q) => { if (!e.length) return 0; const target = q * t; let lo = 0, hi = e.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (cum[m] >= target) hi = m; else lo = m + 1; } return e[lo]; };
  return { e, w, total: t, below, quantile, order };
}
/** The base thresholds, by how much of the range bets for value, with `rho` bluffs for every value bet. */
function base(G, s, rho) {
  let lo = 0, hi = 1 / (1 + rho);
  for (let k = 0; k < 40; k++) { const v = (lo + hi) / 2; const b = G.quantile(1 - v); const a = v > 0 ? G.quantile(Math.min(1, rho * v)) : 0; if (b - (1 + (s + a) / (1 + s)) / 2 > 0) lo = v; else hi = v; }
  const v = (lo + hi) / 2; const a = v > 0 ? G.quantile(Math.min(1, rho * v)) : 0; return { v, fold: Math.min(1, (s + a) / (1 + s)) };
}
/** First to act, where a check is not a showdown (derive.py, A). */
function outOfPosition(G, s) {
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
function beatsNow(board, mine, his, ids) {
  const strength = new Float64Array(N); const all = ids.filter((c) => mine[c] > 0 || his[c] > 0); for (const c of all) strength[c] = fs.evaluateCards([...board, CA(c), CB(c)]);
  const out = new Float64Array(N).fill(NaN); const theirs = all.filter((c) => his[c] > 0);
  for (const h of all) { if (!(mine[h] > 0)) continue; let w = 0, t = 0; const a = CA(h), b = CB(h); for (const v of theirs) { if (CA(v) === a || CA(v) === b || CB(v) === a || CB(v) === b) continue; w += his[v]; t += his[v] * (strength[h] > strength[v] ? 1 : strength[h] === strength[v] ? 0.5 : 0); } if (w > 0) out[h] = t / w; }
  return out;
}
/** Give `amount` of the range (a share of its weight) to the hands in `order`, each up to what it has free. Returns per-hand shares. */
function fill(order, weights, amount, taken) {
  const out = new Float64Array(N); let left = amount;
  for (const c of order) { if (left <= 1e-12) break; const free = weights[c] * (1 - (taken ? taken[c] : 0)); if (free <= 0) continue; const take = Math.min(free, left); out[c] = take / weights[c]; left -= take; }
  return out;
}

// ---- the formulas, as a strategy ------------------------------------------------------------------------------------
/**
 * The player to act may check or bet `s` pots. Returns each hand's chance of betting, and how much of the other range
 * the formulas expect to fold (which the other player then does).
 */
function betting(kind, board, mine, his, ids, s, first, river) {
  const live = ids.filter((c) => mine[c] > 0); const W = live.reduce((t, c) => t + mine[c], 0); const rho = s / (1 + s);
  const e = equityVs(fs, board, mine, his); const bet = new Float64Array(N);
  if (!W) return { bet, fold: rho };
  if (kind === 'equity') {
    // for scale: the one-street thresholds on equity, at every street and seat (the base as it stood before any of this work)
    const G = dist(e, mine, live); const t = base(G, s, rho); const strong = [...G.order].reverse(); const value = fill(strong, mine, t.v * W); const bluff = fill(G.order, mine, rho * t.v * W, value);
    for (const c of live) bet[c] = Math.min(1, value[c] + bluff[c]); return { bet, fold: t.fold };
  }
  const now = river ? e : beatsNow(board, mine, his, ids); const G = dist(now, mine, live); const t = first ? outOfPosition(G, s) : base(G, s, rho);
  const strong = [...G.order].reverse(); const value = fill(strong, mine, t.v * W);
  if (river) { const bluff = fill(G.order, mine, rho * t.v * W, value); for (const c of live) bet[c] = Math.min(1, value[c] + bluff[c]); return { bet, fold: t.fold }; }
  // before the river: a called bluff still wins q of the time, and counts as 1 - q(1+2s)/(1+s) of a bluff (derive5.py)
  const order = dist(e, his, ids.filter((c) => his[c] > 0)); const hisEq = equityVs(fs, board, his, mine); const top = new Float64Array(N); { const ranked = ids.filter((c) => his[c] > 0 && !Number.isNaN(hisEq[c])).sort((x, y) => hisEq[y] - hisEq[x]); let seen = 0; const all = ranked.reduce((u, c) => u + his[c], 0); for (const c of ranked) { if (seen >= all / 3) break; top[c] = his[c]; seen += his[c]; } }
  const eTop = equityVs(fs, board, mine, top); const c = Math.min(0.99, t.fold); const calls = 1 - c; void order;
  const q = (h) => { const lo = Number.isNaN(eTop[h]) ? e[h] : eTop[h]; return Math.min(1, Math.max(0, calls > 1 / 3 ? lo + (e[h] - lo) * (calls - 1 / 3) / (2 / 3) : lo)); };
  const gain = (h) => c + (1 - c) * (q(h) * (1 + 2 * s) - s) - now[h];
  let budget = rho * t.v * W; const rest = live.filter((h) => !Number.isNaN(now[h])).sort((x, y) => gain(y) - gain(x));
  for (const h of rest) { const free = mine[h] * (1 - value[h]); if (free <= 0) continue; const weight = Math.min(1, Math.max(0.05, 1 - q(h) * (1 + 2 * s) / (1 + s))); const take = Math.min(free, budget / weight); bet[h] = take / mine[h]; budget -= take * weight; if (budget <= 1e-9) break; }
  for (const h of live) bet[h] = Math.min(1, bet[h] + value[h]);
  return { bet, fold: t.fold };
}
/** Facing a bet: fold the given share of the range, the hands with the least equity. Returns each hand's chance of folding. */
function folding(kind, board, mine, his, ids, share, s) {
  const live = ids.filter((c) => mine[c] > 0); const W = live.reduce((t, c) => t + mine[c], 0); const e = equityVs(fs, board, mine, his);
  const order = live.filter((c) => !Number.isNaN(e[c])).sort((x, y) => e[x] - e[y]);
  return fill(order, mine, (kind === 'price' ? s / (1 + s) : share) * W);
}

// ---- writing a strategy into the solver, and reading its loss --------------------------------------------------------
function writer(run) {
  const ctx = run.solver.ctx; const L = ctx.active; const lay = ctx.layout;
  return (node, board, probsOf) => {
    const owner = ctx.tree.player[node]; const actions = ctx.tree.numEdges[node]; const slot = (L.roundBase[ctx.tree.round[node]] + board) * 2 + owner; const from = L.start[slot]; const count = L.count[slot]; const at = lay.offset[node] + actions * lay.rowStart[slot];
    for (let i = 0; i < count; i++) { const combo = L.memberCombo[L.memberStart[from + i]]; const p = probsOf(combo); for (let a = 0; a < actions; a++) ctx.strategySum[at + i + a * count] = p[a]; }
  };
}
/** Copies a solved strategy for one player's decisions into an analysis run. */
function copySolved(solved, target, nodes, boardsOf, player) {
  const write = writer(target); const spot = solved.spot ?? null; void spot;
  for (const n of nodes) { if (n.kind !== 'decision' || (n.seat === 'ip' || n.seat === 1 ? 1 : 0) !== player) continue; for (const b of boardsOf(n.round)) { const view = solved.strategyAt(n.id, b); const row = new Map(Array.from(view.combos).map((c, i) => [c, i])); const k = view.actions.length; write(n.id, b, (combo) => { const i = row.get(combo); return Array.from({ length: k }, (_, a) => (i == null ? 1 / k : view.probs[i * k + a])); }); } }
}
/** Builds one player's formula strategy (or both) over a turn spot and writes it. `kind`: 'derived', 'equity' or 'price' (derived bets, folds by the price alone). */
function playFormulas(spot, nodes, run, kind, players, rounds = [0, 1]) {
  const write = writer(run); const ids = Array.from({ length: N }, (_, c) => c); const start = [0, 1].map((p) => { const w = new Float64Array(N); const pl = spot.players[p]; Array.from(pl.combos).forEach((c, i) => { w[c] = pl.weights.length === N ? pl.weights[c] : pl.weights[i]; }); return w; });
  const turn = Array.from(spot.board); const rivers = spot.runouts.counts[1]; const width = spot.runouts.width[1]; const riverCard = (k) => { for (let j = 0; j < width; j++) { const c = spot.runouts.cards[1][k * width + j]; if (!turn.includes(c)) return c; } return -1; };
  const walk = (id, board, bIndex, reach, expectFold) => {
    const n = nodes[id];
    if (n.kind === 'chance') { for (let k = 0; k < rivers; k++) { const card = riverCard(k); const next = reach.map((r) => { const o = Float64Array.from(r); for (let c = 0; c < N; c++) if (CA(c) === card || CB(c) === card) o[c] = 0; return o; }); walk(n.edges[0].child, [...turn, card], k, next, null); } return; }
    if (n.kind !== 'decision') return;
    const p = n.seat === 'ip' || n.seat === 1 ? 1 : 0; const mine = reach[p]; const his = reach[1 - p]; const river = board.length === 5; const toCall = n.invested[1 - p] - n.invested[p]; const kinds = n.edges.map((x) => x.kind);
    let probs; let passDown = null;
    if (toCall > 0) {
      const s = toCall / (n.pot - toCall); const fold = folding(kind === 'price' ? 'price' : 'derived', board, mine, his, ids, expectFold ?? s / (1 + s), s); const fi = kinds.indexOf('fold'); const ci = kinds.indexOf('call');
      probs = (c) => kinds.map((_, a) => (a === fi ? fold[c] : a === ci ? 1 - fold[c] : 0));
    } else {
      const bi = kinds.findIndex((k) => k === 'bet' || k === 'allin'); const xi = kinds.indexOf('check');
      if (bi < 0) probs = () => kinds.map((_, a) => (a === xi ? 1 : 0));
      else { const s = (nodes[n.edges[bi].child].invested[p] - n.invested[p]) / n.pot; const first = n.parent < 0 || nodes[n.parent].kind === 'chance'; const t = betting(kind === 'equity' ? 'equity' : 'derived', board, mine, his, ids, s, first && kind !== 'equity', river); passDown = t.fold; probs = (c) => kinds.map((_, a) => (a === bi ? t.bet[c] : a === xi ? 1 - t.bet[c] : 0)); }
    }
    if (players.includes(p) && rounds.includes(n.round)) write(id, bIndex, (c) => probs(c));
    n.edges.forEach((edge, a) => { const next = [Float64Array.from(reach[0]), Float64Array.from(reach[1])]; for (let c = 0; c < N; c++) if (next[p][c] > 0) next[p][c] *= probs(c)[a]; walk(edge.child, board, bIndex, next, kinds[a] === 'bet' || kinds[a] === 'allin' ? passDown : null); });
  };
  walk(0, turn, 0, start, null);
}

// ---- the spots: turn decisions of the unseen collection, with the ranges that reached them ----------------------------
const [count = '30', seed = '9'] = process.argv.slice(2);
const lines = readFileSync(new URL(`./out/hands-${seed}.jsonl`, import.meta.url), 'utf8').split('\n').filter(Boolean); const picked = []; const seen = new Set();
for (const l of lines) { if (picked.length >= +count * 4) break; if (!l.includes('|first"')) continue; const d = JSON.parse(l); if (d.board.replace(/ /g, '').length !== 8 || !/^(xx|bc\d|xbc\d)\|first$/.test(d.line) || d.toCall > 0 || !d.vr || Math.min(...d.reach) < 0.25) continue; const key = `${d.spot}|${d.line.replace(/\d/, '')}`; if (seen.has(key)) continue; seen.add(key); picked.push(d); }
const out = new URL('./out/play.jsonl', import.meta.url); writeFileSync(out, '');
const TREE = { betSizes: [[0.75], [0.75]], maxRaises: 1 };
let done = 0;
for (const d of picked) {
  if (done >= +count) break;
  const oop = d.hands.filter((h) => h.w > 0.01).map((h) => `${h.h}:${h.w}`).join(','); const ip = d.vr.filter((v) => v[1] > 0.01).map((v) => `${v[0]}:${v[1]}`).join(',');
  let spot; try { spot = fs.defineSpot({ board: d.board.replace(/ /g, ''), pot: d.pot, stack: Math.max(d.behind, 1), oop, ip, ...TREE }); } catch (e) { console.error('skip', d.spot, String(e.message).slice(0, 70)); continue; }
  const nodes = treeOf(fs, spot); const solve = fs.createRun(spot, { isomorphism: false }); let ex = 9; while (ex > 0.02 && solve.completed < 3000) { solve.step(20); ex = solve.exploitabilityPercent(); }
  const solved = solve.snapshot(); const boardsOf = (round) => Array.from({ length: spot.runouts.counts[round] }, (_, i) => i);
  const fresh = () => fs.createRun(spot, { analysisOnly: true, isomorphism: false }); const lossOf = (run) => 100 * run.solver.exploitability() / (spot.potUnits / spot.chipScale);
  // the check on the method: the solved strategy, copied into an analysis run, must score as the solve does
  const same = fresh(); copySolved(solved, same, nodes, boardsOf, 0); copySolved(solved, same, nodes, boardsOf, 1); const check = lossOf(same);
  const row = { spot: d.spot, board: d.board, line: d.line, pot: d.pot, spr: +(d.behind / d.pot).toFixed(2), solved: +ex.toFixed(3), copied: +check.toFixed(3) };
  for (const kind of ['derived', 'price', 'equity']) {
    const both = fresh(); playFormulas(spot, nodes, both, kind, [0, 1]); row[kind] = +lossOf(both).toFixed(2);
    // one seat on the formulas against the solver's equilibrium in the other: what a best response then wins from it,
    // and what it simply gives up to the equilibrium player (its own value, against what it has at equilibrium)
    for (const p of [0, 1]) { const one = fresh(); copySolved(solved, one, nodes, boardsOf, 1 - p); playFormulas(spot, nodes, one, kind, [p]); const tag = `${kind}_${p ? 'ip' : 'oop'}`; row[tag] = +(2 * lossOf(one)).toFixed(2); row[`${tag}_eq`] = +(100 * (solved.ev(p) - one.snapshot().ev(p)) / d.pot).toFixed(2); }
  }
  // where the loss is: the formulas on one street only, the solver's play on the other
  for (const [name, rounds] of [['turn_only', [0]], ['river_only', [1]]]) { const part = fresh(); copySolved(solved, part, nodes, boardsOf, 0); copySolved(solved, part, nodes, boardsOf, 1); playFormulas(spot, nodes, part, 'derived', [0, 1], rounds); row[name] = +lossOf(part).toFixed(2); }
  appendFileSync(out, JSON.stringify(row) + '\n'); done++;
  console.error(`${d.spot} ${d.board} ${d.line}: solved ${row.solved} copied ${row.copied} | derived ${row.derived} (oop ${row.derived_oop}, ip ${row.derived_ip}; against the equilibrium oop ${row.derived_oop_eq}, ip ${row.derived_ip_eq}; equity-ruler oop ${row.equity_oop_eq}, ip ${row.equity_ip_eq}) | price ${row.price} | equity ${row.equity} | derived on the turn only ${row.turn_only}, on the river only ${row.river_only}`);
}
