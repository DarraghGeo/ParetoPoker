// The play test from the flop: the formulas as a whole strategy over the flop, every turn and every river, scored by the
// solver. One seat on the formulas and the other on the solver's equilibrium gives what that seat gives up to a sound
// opponent, and what a perfect best response wins from it; the formulas on one street only (the solver's play on the
// others) says where it is lost.
//   node play-flop.mjs [spots] [seed]     -> out/play-flop.jsonl
import { writeFileSync, appendFileSync, readFileSync } from 'node:fs';
import * as fs from 'poker-flopsolve';
import { treeOf, equityVs } from '../../src/solver/flopsolve.js';
import { PRESETS } from '../../web/presets.js';
import { acting, facing, fill, denial } from './formulas.mjs';
import { facts, tunedBet, tunedFold, tunedRaise, foldBase } from './tuned.mjs';
const N = fs.COMBOS; const CA = (c) => fs.COMBO_CARDS[2 * c]; const CB = (c) => fs.COMBO_CARDS[2 * c + 1];
const seatOf = (n) => (n.seat === 'ip' || n.seat === 1 ? 1 : 0);
/** Writes strategies into a run's store: `probsOf(combo)` for one node on one board. */
function writer(run) {
  const ctx = run.solver.ctx; const L = ctx.active; const lay = ctx.layout;
  return (node, board, probsOf) => {
    const owner = ctx.tree.player[node]; const actions = ctx.tree.numEdges[node]; const slot = (L.roundBase[ctx.tree.round[node]] + board) * 2 + owner; const from = L.start[slot]; const count = L.count[slot]; const at = lay.offset[node] + actions * lay.rowStart[slot];
    for (let i = 0; i < count; i++) { const p = probsOf(L.memberCombo[L.memberStart[from + i]]); for (let a = 0; a < actions; a++) ctx.strategySum[at + i + a * count] = p[a]; }
  };
}
function copySolved(solved, target, nodes, counts, player, rounds = [0, 1, 2, 3]) {
  const write = writer(target);
  for (const n of nodes) { if (n.kind !== 'decision' || seatOf(n) !== player || !rounds.includes(n.round)) continue; for (let b = 0; b < counts[n.round]; b++) { const view = solved.strategyAt(n.id, b); const row = new Map(Array.from(view.combos).map((c, i) => [c, i])); const k = view.actions.length; write(n.id, b, (combo) => { const i = row.get(combo); return Array.from({ length: k }, (_, a) => (i == null ? 1 / k : view.probs[i * k + a])); }); } }
}
/**
 * The formula strategy over the whole spot. Flop and turn decisions are returned (they are few); river decisions are
 * written as they are worked out into each run of `live` ([{ write, players }]), since there are too many to keep.
 */
const VARIANT = process.env.VARIANT ?? 'full';   // 'noraise': never raises; 'onesize': bets one size (the one nearest three quarters of the pot); 'plain': both
const TUNE = new Set((process.env.TUNE ?? '').split(',').filter(Boolean));   // which fitted corrections replace the derived amounts: bet, fold, raise
const START = +(process.env.START ?? 0);   // the first street the formulas play; the solver's own play before it (1: from the turn, 2: the river only)
const BELIEF = +(process.env.BELIEF ?? 0);   // how cleanly the other player is taken to sort his hands: 0 as the formulas would, 1 not at all (each action taken by every hand alike); between, blurred over that share of his range
const SOFT = +(process.env.SOFT ?? 0);     // blur: each hand plays the average of the hands within this share of the range around it (0: as the formulas have it)
function formulaStrategy(spot, nodes, live, solved = null) {
  const R = spot.runouts; const ids = Array.from({ length: N }, (_, c) => c); const out = []; let count = 0; const diag = new Map(); const mass0 = [0, 1].map((p) => { let t = 0; const pl = spot.players[p]; for (const c of Array.from(pl.combos)) t += pl.weights.length === N ? pl.weights[c] : 0; return t || 1; }); const pot0 = nodes[0].pot; const stack = spot.source?.stack ?? spot.stackUnits / spot.chipScale;
  const start = [0, 1].map((p) => { const w = new Float64Array(N); const pl = spot.players[p]; Array.from(pl.combos).forEach((c, i) => { w[c] = pl.weights.length === N ? pl.weights[c] : pl.weights[i]; }); return w; });
  const walk = (id, board, bIndex, reach, expectFold, seen = reach) => {
    const n = nodes[id];
    if (n.kind === 'chance') {
      const next = nodes[n.edges[0].child].round;
      for (let k = R.childStart[next][bIndex]; k < R.childStart[next][bIndex + 1]; k++) {
        const w = R.width[next]; const cards = Array.from(R.cards[next].subarray(k * w, k * w + w)); const card = cards.find((c) => !board.includes(c));
        const deal = (set) => set.map((r) => { const o = Float64Array.from(r); for (let c = 0; c < N; c++) if (CA(c) === card || CB(c) === card) o[c] = 0; return o; }); const dealt = deal(reach);
        walk(n.edges[0].child, [...board, card], k, dealt, null, seen === reach ? dealt : deal(seen));
      }
      return;
    }
    if (n.kind !== 'decision') return;
    const p = seatOf(n); const mine = reach[p]; const his = seen[1 - p]; const river = board.length === 5; const toCall = n.invested[1 - p] - n.invested[p]; const kinds = n.edges.map((x) => x.kind); const k = kinds.length;
    const hands = ids.filter((c) => mine[c] > 0); const probs = new Float32Array(hands.length * k); const passDown = kinds.map(() => null); count++; let modelled = null;
    const addOf = (a) => nodes[n.edges[a].child].invested[p] - n.invested[p];
    const SOLVERAT = process.env.SOLVERAT ?? '';   // the solver's own play at one kind of decision before the river: 'bet' (to act), 'face' (facing a wager)
    if (hands.length && (n.round < START || (!river && ((SOLVERAT === 'bet' && toCall === 0) || (SOLVERAT === 'face' && toCall > 0))))) {
      // the solver's own play on the earlier streets: the later ones then start from ranges shaped as the solver shapes them
      const view = solved.strategyAt(id, bIndex); const row = new Map(Array.from(view.combos).map((c, i) => [c, i])); hands.forEach((c, i) => { const j = row.get(c); for (let a = 0; a < k; a++) probs[i * k + a] = j == null ? (a === 0 ? 1 : 0) : view.probs[j * k + a]; });
    } else if (!hands.length) { /* nothing gets here */ } else if (toCall > 0) {
      const fi = kinds.indexOf('fold'); const ci = kinds.indexOf('call'); let ri = kinds.indexOf('raise'); if (ri < 0) ri = kinds.indexOf('allin'); if (VARIANT === 'noraise' || VARIANT === 'plain') ri = -1;
      let share = (expectFold && expectFold.fold != null ? expectFold.fold : expectFold) ?? toCall / n.pot; let F = null;
      if ((TUNE.has('fold') || TUNE.has('raise')) && expectFold && expectFold.thr != null) { const e1 = equityVs(fs, board, mine, his); const e2 = equityVs(fs, board, his, mine); F = facts(board, mine, his, e1, e2, ids, { ip: p, s: toCall / (n.pot - toCall), prior_adv: expectFold.prior, lspr: Math.log(Math.min(30, Math.max(0.05, (stack - Math.max(...n.invested)) / n.pot))) }); if (TUNE.has('fold')) share = tunedFold(board.length, expectFold.thr, F) ?? share; }
      const t = facing(board, mine, his, ids, share, ri >= 0 ? { add: addOf(ri), pot: n.pot, toCall } : null, river);
      if (TUNE.has('raise') && F && ri >= 0 && kinds[ri] === 'raise') {
        // the fitted raise frequency: the derived raises thinned alike, or topped up alike from the hands that call
        const want = tunedRaise(board.length, F); const W = hands.reduce((u, c) => u + mine[c], 0); const have = hands.reduce((u, c) => u + mine[c] * t.up[c], 0) / W;
        if (want != null) { if (have > want) for (const c of hands) t.up[c] *= want / have; else { const room = hands.reduce((u, c) => u + mine[c] * Math.max(0, 1 - t.up[c] - t.fold[c]), 0) / W; const lam = room > 0 ? Math.min(1, (want - have) / room) : 0; for (const c of hands) t.up[c] += lam * Math.max(0, 1 - t.up[c] - t.fold[c]); } }
      }
      hands.forEach((c, i) => { const up = ri >= 0 ? t.up[c] : 0; const f = Math.min(1 - up, t.fold[c]); probs[i * k + fi] = f; if (ri >= 0) probs[i * k + ri] = up; probs[i * k + ci] = Math.max(0, 1 - f - up); });
      if (ri >= 0) passDown[ri] = t.expect;   // a raise is answered by the derived rule: the corrections were fitted on bets
    } else {
      const bets = kinds.map((x, a) => (x === 'bet' || x === 'allin' ? a : -1)).filter((a) => a >= 0); const xi = kinds.indexOf('check');
      if (!bets.length) hands.forEach((c, i) => { probs[i * k + xi] = 1; });
      else {
        // the sizes on offer, smallest first
        let sized = bets.map((a) => ({ a, s: addOf(a) / n.pot })).sort((y, z) => y.s - z.s); if (VARIANT === 'onesize' || VARIANT === 'plain') sized = [sized.reduce((b, y) => (Math.abs(y.s - 0.75) < Math.abs(b.s - 0.75) ? y : b))]; const first = n.parent < 0 || nodes[n.parent].kind === 'chance';
        const depthOf = TUNE.has('deep') || TUNE.has('deepbig') ? { left: (stack - Math.max(...n.invested)) / n.pot, streets: 6 - board.length, mode: TUNE.has('deepbig') ? 'big' : 'all' } : null;
        const t = acting(board, mine, his, ids, sized.map((y) => y.s), first, river, 0.75, depthOf);
        if (process.env.MODEL === 'deep' && !river) {
          // how the other player is taken to read this decision: as a player who bets for value only what can bet every street left
          const m = acting(board, seen[p], reach[1 - p], ids, sized.map((y) => y.s), first, river, 0.75, { left: (stack - Math.max(...n.invested)) / n.pot, streets: 6 - board.length, mode: 'all' });
          modelled = new Float32Array(hands.length * k); hands.forEach((c, i) => { let all = 0; sized.forEach((y, j) => { const v = Math.min(1 - all, m.bets[j][c]); modelled[i * k + y.a] = v; all += v; }); modelled[i * k + xi] = Math.max(0, 1 - all); });
        }
        hands.forEach((c, i) => { let all = 0; sized.forEach((y, j) => { const v = Math.min(1 - all, t.bets[j][c]); probs[i * k + y.a] = v; all += v; }); probs[i * k + xi] = Math.max(0, 1 - all); });
        if (TUNE.size) {
          const e1 = equityVs(fs, board, mine, his); const e2 = equityVs(fs, board, his, mine); const F = facts(board, mine, his, e1, e2, ids, { lspr: Math.log(Math.min(30, Math.max(0.05, (stack - Math.max(...n.invested)) / n.pot))) });
          if (TUNE.has('denyhands') && board.length < 5) {
            // the denial rule choosing the hands as well: every hand that gains by betting bets (the size the thresholds gave it, else the smallest), the rest check
            const dn = denial(board, mine, his, ids, sized[0].s); if (dn) { const inSet = new Uint8Array(N); for (const c of dn.bets) inSet[c] = 1; for (const c of hands) { const had = t.bets.reduce((u, b) => u + b[c], 0); if (!inSet[c]) for (const b of t.bets) b[c] = 0; else if (had < 1) t.bets[0][c] += 1 - had; }
              hands.forEach((c, i) => { let all = 0; sized.forEach((y, j) => { const v = Math.min(1 - all, t.bets[j][c]); probs[i * k + y.a] = v; all += v; }); probs[i * k + xi] = Math.max(0, 1 - all); }); }
          }
          if (TUNE.has('geo') && sized.length > 1) {
            // sizes by the stacks: the bet that gets the money in by the river if it is made on every street left. When that is nearer
            // the smaller size on offer, nothing needs the bigger one, and its bets are made at the smaller size instead
            const left = (stack - Math.max(...n.invested)) / n.pot; const streets = 6 - board.length; const g = (Math.pow(1 + 2 * left, 1 / streets) - 1) / 2;
            for (let j = sized.length - 1; j >= 1; j--) if (Math.abs(g - sized[j - 1].s) < Math.abs(g - sized[j].s)) { for (const c of hands) { t.bets[j - 1][c] = Math.min(1, t.bets[j - 1][c] + t.bets[j][c]); t.bets[j][c] = 0; } }
            hands.forEach((c, i) => { let all = 0; sized.forEach((y, j) => { const v = Math.min(1 - all, t.bets[j][c]); probs[i * k + y.a] = v; all += v; }); probs[i * k + xi] = Math.max(0, 1 - all); });
          }
          if ((TUNE.has('bet') || TUNE.has('deny')) && board.length < 5) {
            // the fitted bet frequency: the derived bets thinned alike, or topped up alike with the smallest size
            const want = TUNE.has('deny') ? denial(board, mine, his, ids, sized[0].s, 8, TUNE.has('bettor') ? 'bettor' : 'caller')?.share : tunedBet(board.length, first, e1, mine, ids, sized[0].s, F); const W = hands.reduce((u, c) => u + mine[c], 0); const total = (c) => t.bets.reduce((u, b) => u + b[c], 0); const have = hands.reduce((u, c) => u + mine[c] * Math.min(1, total(c)), 0) / W;
            if (want != null && have > 0) { if (have > want) for (const b of t.bets) for (const c of hands) b[c] *= want / have; else { const lam = Math.min(1, (want - have) / Math.max(1e-9, 1 - have)); for (const c of hands) t.bets[0][c] += lam * Math.max(0, 1 - total(c)); } }
            hands.forEach((c, i) => { let all = 0; sized.forEach((y, j) => { const v = Math.min(1 - all, t.bets[j][c]); probs[i * k + y.a] = v; all += v; }); probs[i * k + xi] = Math.max(0, 1 - all); });
          }
          if (TUNE.has('fold') || TUNE.has('raise')) sized.forEach((y, j) => { passDown[y.a] = { fold: t.folds[j], thr: foldBase(e1, mine, ids, y.s), prior: F.adv }; }); else sized.forEach((y, j) => { passDown[y.a] = t.folds[j]; });
        } else sized.forEach((y, j) => { passDown[y.a] = t.folds[j]; });
      }
    }
    if (SOFT > 0 && hands.length > 2 && n.round >= START) {
      // the same amounts, the edges blurred: every hand plays the average of its neighbours by equity, so no action holds only one kind of hand
      const eq = equityVs(fs, board, mine, his); const order = hands.map((c, i) => i).sort((x, y) => (eq[hands[x]] || 0) - (eq[hands[y]] || 0)); const W = order.reduce((t, i) => t + mine[hands[i]], 0);
      const mid = new Float64Array(order.length); const cumW = new Float64Array(order.length + 1); const cum = Array.from({ length: k }, () => new Float64Array(order.length + 1)); let run = 0;
      order.forEach((i, r) => { const w = mine[hands[i]]; mid[r] = (run + w / 2) / W; run += w; cumW[r + 1] = cumW[r] + w; for (let a = 0; a < k; a++) cum[a][r + 1] = cum[a][r] + w * probs[i * k + a]; });
      const next = new Float32Array(probs.length); let lo = 0, hi = 0;
      order.forEach((i, r) => { while (mid[lo] < mid[r] - SOFT / 2) lo++; while (hi < order.length && mid[hi] <= mid[r] + SOFT / 2) hi++; const w = cumW[hi] - cumW[lo]; for (let a = 0; a < k; a++) next[i * k + a] = w > 0 ? (cum[a][hi] - cum[a][lo]) / w : probs[i * k + a]; });
      probs.set(next);
    }
    if (VARIANT === 'oraclehands' && solved && hands.length) {
      // the formulas' amounts, the solver's choice of hands: each action keeps how much of the range the formulas gave it,
      // and goes to the hands the solver plays it with most. What is left over is the part of the loss that is not selection.
      const view = solved.strategyAt(id, bIndex); const row = new Map(Array.from(view.combos).map((c, i) => [c, i])); const passive = toCall > 0 ? kinds.indexOf('call') : kinds.indexOf('check');
      const mass = kinds.map((_, a) => hands.reduce((t, c, i) => t + mine[c] * probs[i * k + a], 0)); const taken = new Float64Array(N); const next = new Float32Array(hands.length * k);
      const order = kinds.map((_, a) => a).filter((a) => a !== passive).sort((x, y) => (kinds[y] === 'fold' ? -1 : addOf(y)) - (kinds[x] === 'fold' ? -1 : addOf(x)));   // the biggest wager first, folding last
      for (const a of order) { const key = new Float64Array(N); for (const c of hands) { const i = row.get(c); key[c] = i == null ? 0 : -Math.round(view.probs[i * k + a] * 1e6) / 1e6; } const list = [...hands].sort((x, y) => key[x] - key[y]); const share = fill(list, mine, mass[a], taken, key); hands.forEach((c, i) => { next[i * k + a] = share[c]; taken[c] = Math.min(1, taken[c] + share[c]); }); }
      hands.forEach((c, i) => { next[i * k + passive] = Math.max(0, 1 - taken[c]); }); probs.set(next);
    }
    if (VARIANT === 'oraclefreq' && solved && hands.length) {
      // the mirror: the solver's amounts (what its strategy would do with this range, action by action), the formulas' choice
      // of hands: each action goes first to the hands the formulas gave it, then on by equity (up for a wager, down for a fold)
      const view = solved.strategyAt(id, bIndex); const row = new Map(Array.from(view.combos).map((c, i) => [c, i])); const passive = toCall > 0 ? kinds.indexOf('call') : kinds.indexOf('check'); const eq = equityVs(fs, board, mine, his);
      const mass = kinds.map((_, a) => hands.reduce((t, c) => { const i = row.get(c); return t + mine[c] * (i == null ? 0 : view.probs[i * k + a]); }, 0)); const taken = new Float64Array(N); const next = new Float32Array(hands.length * k);
      const order = kinds.map((_, a) => a).filter((a) => a !== passive).sort((x, y) => (kinds[y] === 'fold' ? -1 : addOf(y)) - (kinds[x] === 'fold' ? -1 : addOf(x)));
      for (const a of order) { const key = new Float64Array(N); hands.forEach((c, i) => { const e1 = Number.isNaN(eq[c]) ? 0.5 : eq[c]; key[c] = -Math.round(probs[i * k + a] * 1e3) - (kinds[a] === 'fold' ? 1 - e1 : e1) * 0.999; }); const list = [...hands].sort((x, y) => key[x] - key[y]); const share = fill(list, mine, mass[a], taken, key); hands.forEach((c, i) => { next[i * k + a] = share[c]; taken[c] = Math.min(1, taken[c] + share[c]); }); }
      hands.forEach((c, i) => { next[i * k + passive] = Math.max(0, 1 - taken[c]); }); probs.set(next);
    }
    if (process.env.DIAG && solved && hands.length && n.round >= START) {
      // where the amounts part from the solver's: the solver's strategy on the range that is here, added up, beside the formulas'
      const view = solved.strategyAt(id, bIndex); const row = new Map(Array.from(view.combos).map((c, i) => [c, i])); const W = hands.reduce((t, c) => t + mine[c], 0); const hisW = ids.reduce((t, c) => t + his[c], 0);
      const cls = kinds.map((x, a) => (x === 'fold' ? 'fold' : x === 'call' || x === 'check' ? 'passive' : toCall > 0 ? 'raise' : 'bet')); const big = kinds.map((_, a) => a).filter((a) => cls[a] === 'bet').sort((x, y) => addOf(y) - addOf(x))[0];
      const sum = (pick, from) => hands.reduce((t, c, i) => { const j = row.get(c); let v = 0; for (let a = 0; a < k; a++) if (pick(a)) v += from === 'f' ? probs[i * k + a] : (j == null ? 0 : view.probs[j * k + a]); return t + mine[c] * v; }, 0) / W;
      const suits = [0, 1, 2, 3].map((x) => board.filter((c) => fs.suitOf(c) === x).length); const most = Math.max(...suits); const last = board[board.length - 1]; const came = board.length > 3 && suits[fs.suitOf(last)] === 3 && most === 3;
      const type = toCall > 0 ? (nodes[n.parent].invested[p] < n.invested[1 - p] && nodes[n.parent].invested[1 - p] > nodes[n.parent].invested[p] ? 'face a raise' : 'face a bet') : (n.parent < 0 || nodes[n.parent].kind === 'chance' ? 'first to act' : 'after a check');
      const key = `${['flop', 'turn', 'river'][board.length - 3]}|${type}|${most >= 3 ? (came ? 'flush card just came' : 'flush possible') : most === 2 ? 'two of a suit' : 'rainbow'}`;
      const weight = (W / mass0[p]) * (hisW / mass0[1 - p]) * (n.pot / pot0) * (R.childStart ? 1 : 1) * (1 / R.counts[n.round]);
      const g = diag.get(key) ?? { w: 0, n: 0 }; g.w += weight; g.n++;
      const add = (name, f, sv) => { g[name] = (g[name] ?? 0) + weight * (f - sv); g[`${name}_abs`] = (g[`${name}_abs`] ?? 0) + weight * Math.abs(f - sv); g[`${name}_solver`] = (g[`${name}_solver`] ?? 0) + weight * sv; };
      if (toCall > 0) { add('fold', sum((a) => cls[a] === 'fold', 'f'), sum((a) => cls[a] === 'fold', 's')); add('raise', sum((a) => cls[a] === 'raise', 'f'), sum((a) => cls[a] === 'raise', 's')); }
      else { add('bet', sum((a) => cls[a] === 'bet', 'f'), sum((a) => cls[a] === 'bet', 's')); if (big != null) add('big', sum((a) => a === big, 'f'), sum((a) => a === big, 's')); }
      diag.set(key, g);
      if (toCall === 0 && !river) {
        // by strength: the range in ten parts by equity, what each part does, ours and the solver's
        const eq = equityVs(fs, board, mine, his); const order = hands.map((c, i) => i).sort((x, y) => (eq[hands[x]] || 0) - (eq[hands[y]] || 0)); let run = 0; const dk = `deciles|${type}`; const D = diag.get(dk) ?? { w: 0, parts: Array.from({ length: 10 }, () => ({ w: 0, fb: 0, sb: 0, fg: 0, sg: 0, eq: 0 })) };
        for (const i of order) { const c = hands[i]; const part = D.parts[Math.min(9, Math.floor(((run + mine[c] / 2) / W) * 10))]; run += mine[c]; const j = row.get(c); const wt = weight * mine[c] / W; part.w += wt; part.eq += wt * (eq[c] || 0);
          for (let a = 0; a < k; a++) { if (cls[a] !== 'bet') continue; const f = probs[i * k + a]; const sv = j == null ? 0 : view.probs[j * k + a]; part.fb += wt * f; part.sb += wt * sv; if (a === big) { part.fg += wt * f; part.sg += wt * sv; } } }
        diag.set(dk, D);
      }
    }
    const rec = { node: id, board: bIndex, seat: p, round: n.round, ids: Int16Array.from(hands), probs, k };
    if (!river) out.push(rec); else for (const run of live) writeOne(run.write, rec, run.players);
    // how the other player will read this action: the same strategy with its edges blurred (or not read at all)
    let shown = modelled ?? probs;
    const ORACLE_BELIEF = !!process.env.SOLVERBELIEF && solved && !river;   // a check on the idea: we play the formulas, but read his earlier actions as the solver plays them
    if (ORACLE_BELIEF && hands.length) { const view = solved.strategyAt(id, bIndex); const row = new Map(Array.from(view.combos).map((c, i) => [c, i])); shown = new Float32Array(probs.length); hands.forEach((c, i) => { const j = row.get(c); for (let a = 0; a < k; a++) shown[i * k + a] = j == null ? probs[i * k + a] : view.probs[j * k + a]; }); }
    else if (BELIEF > 0 && hands.length > 2) {
      const shown0 = shown; shown = new Float32Array(probs.length); const base = seen[p]; const W = hands.reduce((t, c) => t + base[c], 0) || 1;
      if (BELIEF >= 1) { const f = new Float64Array(k); hands.forEach((c, i) => { for (let a = 0; a < k; a++) f[a] += base[c] * shown0[i * k + a]; }); hands.forEach((c, i) => { for (let a = 0; a < k; a++) shown[i * k + a] = f[a] / W; }); }
      else {
        const eq = equityVs(fs, board, base, reach[1 - p]); const order = hands.map((c, i) => i).sort((x, y) => (eq[hands[x]] || 0) - (eq[hands[y]] || 0)); const mid = new Float64Array(order.length); const cumW = new Float64Array(order.length + 1); const cum = Array.from({ length: k }, () => new Float64Array(order.length + 1)); let run = 0;
        order.forEach((i, r) => { const w = base[hands[i]]; mid[r] = (run + w / 2) / W; run += w; cumW[r + 1] = cumW[r] + w; for (let a = 0; a < k; a++) cum[a][r + 1] = cum[a][r] + w * shown0[i * k + a]; });
        let lo = 0, hi = 0; order.forEach((i, r) => { while (mid[lo] < mid[r] - BELIEF / 2) lo++; while (hi < order.length && mid[hi] <= mid[r] + BELIEF / 2) hi++; const w = cumW[hi] - cumW[lo]; for (let a = 0; a < k; a++) shown[i * k + a] = w > 0 ? (cum[a][hi] - cum[a][lo]) / w : shown0[i * k + a]; });
      }
    }
    n.edges.forEach((edge, a) => { let any = false; const mineNext = new Float64Array(N); const split = BELIEF > 0 || ORACLE_BELIEF || modelled != null || seen !== reach; const seenNext = split ? new Float64Array(N) : mineNext; hands.forEach((c, i) => { const v = mine[c] * probs[i * k + a]; mineNext[c] = v; if (v > 0) any = true; if (split) seenNext[c] = seen[p][c] * shown[i * k + a]; }); if (!any && nodes[edge.child].kind !== 'decision') return; const next = [reach[0], reach[1]]; next[p] = mineNext; const sNext = [seen[0], seen[1]]; sNext[p] = seenNext; walk(edge.child, board, bIndex, next, passDown[a], split ? sNext : next); });
  };
  walk(0, Array.from(spot.board), 0, start, null);
  return { early: out, count, diag: Object.fromEntries(diag) };
}
const at = new Int32Array(N);
function writeOne(write, s, players) {
  if (!players.includes(s.seat)) return; at.fill(-1); s.ids.forEach((c, i) => { at[c] = i; }); const passive = Array.from({ length: s.k }, (_, a) => (a === 0 ? 1 : 0));
  write(s.node, s.board, (c) => (at[c] < 0 ? passive : Array.from({ length: s.k }, (_, a) => s.probs[at[c] * s.k + a])));
}
function writeFormulas(run, strategy, players, rounds = [0, 1, 2]) { const write = writer(run); for (const s of strategy) if (rounds.includes(s.round)) writeOne(write, s, players); }

const [count = '12', seed = '31'] = process.argv.slice(2);
let a = (+seed * 2654435761) >>> 0; const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; const rand = (k) => Math.floor(rnd() * k);
const ROOT = process.env.ROOT ?? 'flop';   // 'turn': turn spots of the collection, with the ranges the solver brought there
const pool = PRESETS.filter((p) => p.action !== 'Limped' && (!process.env.ONLY || process.env.ONLY.split(',').includes(p.action)));
const TREE = ROOT === 'turn' ? { betSizes: [[0.5, 1], [0.5, 1]], raiseSizes: [{ times: 3 }], maxRaises: 2, allInThreshold: 0.67 } : { betSizes: [[0.33, 1], [0.5, 1], [0.5, 1]], raiseSizes: [{ times: 3 }], maxRaises: 2, allInThreshold: 0.67 };
const out = new URL(`./out/play-full${process.env.TAG ? `-${process.env.TAG}` : ''}.jsonl`, import.meta.url); writeFileSync(out, ''); let done = 0;
// turn spots: one of each line a flop, at least as deep as asked
const turns = []; if (ROOT === 'turn') { const seenT = new Set(); for (const sd of (process.env.FROM ?? '9,7,8').split(',')) { let text; try { text = readFileSync(new URL(`./out/hands-${sd}.jsonl`, import.meta.url), 'utf8'); } catch { continue; } for (const l of text.split('\n')) { if (!l.includes('|first"')) continue; const d = JSON.parse(l); if (d.board.replace(/ /g, '').length !== 8 || !/^(xx|bc\d|xbc\d)\|first$/.test(d.line) || d.toCall > 0 || !d.vr || Math.min(...d.reach) < 0.25) continue; const spr = d.behind / d.pot; if (spr < +(process.env.MINSPR ?? 0) || spr > +(process.env.MAXSPR ?? 99)) continue; const key = `${d.spot}|${d.line.replace(/\d/, '')}`; if (seenT.has(key)) continue; seenT.add(key); turns.push(d); } } for (let i = turns.length - 1; i > 0; i--) { const j = rand(i + 1); [turns[i], turns[j]] = [turns[j], turns[i]]; } }
while (done < +count) {
  let spot; let p; let board;
  if (ROOT === 'turn') {
    const d = turns.shift(); if (!d) break; const oop = d.hands.filter((h) => h.w > 0.01).map((h) => `${h.h}:${h.w}`).join(','); const ip = d.vr.filter((v) => v[1] > 0.01).map((v) => `${v[0]}:${v[1]}`).join(',');
    p = { action: d.action, oop: d.oop, ip: d.ip, pot: d.pot, stack: Math.max(d.behind, 1), line: d.line }; board = [d.board.replace(/ /g, '')];
    try { spot = fs.defineSpot({ board: board[0], pot: p.pot, stack: p.stack, oop, ip, ...TREE }); } catch { continue; }
  } else {
    p = pool[rand(pool.length)]; const deck = 'AKQJT98765432', suits = 'shdc'; board = []; while (board.length < 3) { const c = deck[rand(13)] + suits[rand(4)]; if (!board.includes(c)) board.push(c); }
    try { spot = fs.defineSpot({ board: board.join(''), pot: p.pot, stack: p.stack, oop: p.ranges.oop, ip: p.ranges.ip, ...TREE }); } catch { continue; }
    if (spot.estimate.bytes > +(process.env.MAXMB ?? 700) * 2 ** 20) continue;
  }
  const t0 = Date.now(); const nodes = treeOf(fs, spot); const counts = Array.from(spot.runouts.counts);
  const solve = fs.createRun(spot, { isomorphism: false, workers: +(process.env.WORKERS ?? 4) }); let ex = 9; while (ex > (ROOT === 'turn' ? 0.03 : 0.1) && solve.completed < (ROOT === 'turn' ? 4000 : 1500)) { solve.step(10); ex = solve.exploitabilityPercent(); }
  const solved = solve.snapshot(); const fresh = () => fs.createRun(spot, { analysisOnly: true, isomorphism: false }); const pot = spot.potUnits / spot.chipScale; const lossOf = (run) => 100 * run.solver.exploitability() / pot;
  const same = fresh(); copySolved(solved, same, nodes, counts, 0); copySolved(solved, same, nodes, counts, 1);
  const row = { line: p.line, spot: `${p.action}-${p.oop}-${p.ip}`, action: p.action, board: board.join(''), spr: +(p.stack / p.pot).toFixed(1), solved: +ex.toFixed(3), copied: +lossOf(same).toFixed(3), boards: counts };
  // one walk writes the river into three runs: both seats on the formulas, and each seat alone against the solver
  const both = fresh(); const alone = [0, 1].map((seat) => { const run = fresh(); copySolved(solved, run, nodes, counts, 1 - seat); return run; });
  const strategy = formulaStrategy(spot, nodes, [{ write: writer(both), players: [0, 1] }, { write: writer(alone[0]), players: [0] }, { write: writer(alone[1]), players: [1] }], solved);
  writeFormulas(both, strategy.early, [0, 1]); row.derived = +lossOf(both).toFixed(2); row.decisions = strategy.count; if (process.env.DIAG) row.diag = strategy.diag;
  for (const seat of [0, 1]) {
    const tag = `derived_${seat ? 'ip' : 'oop'}`; writeFormulas(alone[seat], strategy.early, [seat]); row[tag] = +(2 * lossOf(alone[seat])).toFixed(2); row[`${tag}_eq`] = +(100 * (solved.ev(seat) - alone[seat].snapshot().ev(seat)) / pot).toFixed(2);
    let before = 0; for (const [name, rounds] of (ROOT === 'turn' ? [['turn', [0]]] : [['flop', [0]], ['turn', [0, 1]]])) { const part = fresh(); copySolved(solved, part, nodes, counts, 0); copySolved(solved, part, nodes, counts, 1); writeFormulas(part, strategy.early, [seat], rounds); const upTo = 100 * (solved.ev(seat) - part.snapshot().ev(seat)) / pot; row[`${tag}_eq_${name}`] = +(upTo - before).toFixed(2); before = upTo; }
    row[`${tag}_eq_river`] = +(row[`${tag}_eq`] - before).toFixed(2);
  }
  row.seconds = Math.round((Date.now() - t0) / 1000); appendFileSync(out, JSON.stringify(row) + '\n'); done++;
  console.error(`${row.spot} ${row.board}: solved ${row.solved} copied ${row.copied} | derived gives up oop ${row.derived_oop_eq} (flop ${row.derived_oop_eq_flop}, turn ${row.derived_oop_eq_turn}, river ${row.derived_oop_eq_river}), ip ${row.derived_ip_eq} (flop ${row.derived_ip_eq_flop}, turn ${row.derived_ip_eq_turn}, river ${row.derived_ip_eq_river}); to a best response oop ${row.derived_oop}, ip ${row.derived_ip} | ${row.decisions} decisions, ${row.seconds}s`);
}
