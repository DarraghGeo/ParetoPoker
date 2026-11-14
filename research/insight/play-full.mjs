// The play test from the flop: the formulas as a whole strategy over the flop, every turn and every river, scored by the
// solver. One seat on the formulas and the other on the solver's equilibrium gives what that seat gives up to a sound
// opponent, and what a perfect best response wins from it; the formulas on one street only (the solver's play on the
// others) says where it is lost.
//   node play-flop.mjs [spots] [seed]     -> out/play-flop.jsonl
import { writeFileSync, appendFileSync } from 'node:fs';
import * as fs from 'poker-flopsolve';
import { treeOf } from '../../src/solver/flopsolve.js';
import { PRESETS } from '../../web/presets.js';
import { acting, facing } from './formulas.mjs';
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
function copySolved(solved, target, nodes, counts, player, rounds = [0, 1, 2]) {
  const write = writer(target);
  for (const n of nodes) { if (n.kind !== 'decision' || seatOf(n) !== player || !rounds.includes(n.round)) continue; for (let b = 0; b < counts[n.round]; b++) { const view = solved.strategyAt(n.id, b); const row = new Map(Array.from(view.combos).map((c, i) => [c, i])); const k = view.actions.length; write(n.id, b, (combo) => { const i = row.get(combo); return Array.from({ length: k }, (_, a) => (i == null ? 1 / k : view.probs[i * k + a])); }); } }
}
/**
 * The formula strategy over the whole spot. Flop and turn decisions are returned (they are few); river decisions are
 * written as they are worked out into each run of `live` ([{ write, players }]), since there are too many to keep.
 */
const VARIANT = process.env.VARIANT ?? 'full';   // 'noraise': never raises; 'onesize': bets one size (the one nearest three quarters of the pot); 'plain': both
function formulaStrategy(spot, nodes, live) {
  const R = spot.runouts; const ids = Array.from({ length: N }, (_, c) => c); const out = []; let count = 0;
  const start = [0, 1].map((p) => { const w = new Float64Array(N); const pl = spot.players[p]; Array.from(pl.combos).forEach((c, i) => { w[c] = pl.weights.length === N ? pl.weights[c] : pl.weights[i]; }); return w; });
  const walk = (id, board, bIndex, reach, expectFold) => {
    const n = nodes[id];
    if (n.kind === 'chance') {
      const next = board.length - 2;
      for (let k = R.childStart[next][bIndex]; k < R.childStart[next][bIndex + 1]; k++) {
        const w = R.width[next]; const cards = Array.from(R.cards[next].subarray(k * w, k * w + w)); const card = cards.find((c) => !board.includes(c));
        const dealt = reach.map((r) => { const o = Float64Array.from(r); for (let c = 0; c < N; c++) if (CA(c) === card || CB(c) === card) o[c] = 0; return o; });
        walk(n.edges[0].child, [...board, card], k, dealt, null);
      }
      return;
    }
    if (n.kind !== 'decision') return;
    const p = seatOf(n); const mine = reach[p]; const his = reach[1 - p]; const river = board.length === 5; const toCall = n.invested[1 - p] - n.invested[p]; const kinds = n.edges.map((x) => x.kind); const k = kinds.length;
    const hands = ids.filter((c) => mine[c] > 0); const probs = new Float32Array(hands.length * k); const passDown = kinds.map(() => null); count++;
    const addOf = (a) => nodes[n.edges[a].child].invested[p] - n.invested[p];
    if (!hands.length) { /* nothing gets here */ } else if (toCall > 0) {
      const fi = kinds.indexOf('fold'); const ci = kinds.indexOf('call'); let ri = kinds.indexOf('raise'); if (ri < 0) ri = kinds.indexOf('allin'); if (VARIANT === 'noraise' || VARIANT === 'plain') ri = -1;
      const t = facing(board, mine, his, ids, expectFold ?? toCall / n.pot, ri >= 0 ? { add: addOf(ri), pot: n.pot, toCall } : null, river);
      hands.forEach((c, i) => { const up = ri >= 0 ? t.up[c] : 0; const f = Math.min(1 - up, t.fold[c]); probs[i * k + fi] = f; if (ri >= 0) probs[i * k + ri] = up; probs[i * k + ci] = Math.max(0, 1 - f - up); });
      if (ri >= 0) passDown[ri] = t.expect;
    } else {
      const bets = kinds.map((x, a) => (x === 'bet' || x === 'allin' ? a : -1)).filter((a) => a >= 0); const xi = kinds.indexOf('check');
      if (!bets.length) hands.forEach((c, i) => { probs[i * k + xi] = 1; });
      else {
        // the sizes on offer, smallest first
        let sized = bets.map((a) => ({ a, s: addOf(a) / n.pot })).sort((y, z) => y.s - z.s); if (VARIANT === 'onesize' || VARIANT === 'plain') sized = [sized.reduce((b, y) => (Math.abs(y.s - 0.75) < Math.abs(b.s - 0.75) ? y : b))]; const first = n.parent < 0 || nodes[n.parent].kind === 'chance';
        const t = acting(board, mine, his, ids, sized.map((y) => y.s), first, river);
        hands.forEach((c, i) => { let all = 0; sized.forEach((y, j) => { const v = Math.min(1 - all, t.bets[j][c]); probs[i * k + y.a] = v; all += v; }); probs[i * k + xi] = Math.max(0, 1 - all); });
        sized.forEach((y, j) => { passDown[y.a] = t.folds[j]; });
      }
    }
    const rec = { node: id, board: bIndex, seat: p, round: n.round, ids: Int16Array.from(hands), probs, k };
    if (n.round < 2) out.push(rec); else for (const run of live) writeOne(run.write, rec, run.players);
    n.edges.forEach((edge, a) => { let any = false; const mineNext = new Float64Array(N); hands.forEach((c, i) => { const v = mine[c] * probs[i * k + a]; mineNext[c] = v; if (v > 0) any = true; }); if (!any && nodes[edge.child].kind !== 'decision') return; const next = [reach[0], reach[1]]; next[p] = mineNext; walk(edge.child, board, bIndex, next, passDown[a]); });
  };
  walk(0, Array.from(spot.board), 0, start, null);
  return { early: out, count };
}
const at = new Int32Array(N);
function writeOne(write, s, players) {
  if (!players.includes(s.seat)) return; at.fill(-1); s.ids.forEach((c, i) => { at[c] = i; }); const passive = Array.from({ length: s.k }, (_, a) => (a === 0 ? 1 : 0));
  write(s.node, s.board, (c) => (at[c] < 0 ? passive : Array.from({ length: s.k }, (_, a) => s.probs[at[c] * s.k + a])));
}
function writeFormulas(run, strategy, players, rounds = [0, 1, 2]) { const write = writer(run); for (const s of strategy) if (rounds.includes(s.round)) writeOne(write, s, players); }

const [count = '12', seed = '31'] = process.argv.slice(2);
let a = (+seed * 2654435761) >>> 0; const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; const rand = (k) => Math.floor(rnd() * k);
const pool = PRESETS.filter((p) => p.action !== 'Limped' && (!process.env.ONLY || p.action === process.env.ONLY)); const TREE = { betSizes: [[0.33, 1], [0.5, 1], [0.5, 1]], raiseSizes: [{ times: 3 }], maxRaises: 2, allInThreshold: 0.67 };
const out = new URL(`./out/play-full${process.env.TAG ? `-${process.env.TAG}` : ''}.jsonl`, import.meta.url); writeFileSync(out, ''); let done = 0;
while (done < +count) {
  const p = pool[rand(pool.length)]; const deck = 'AKQJT98765432', suits = 'shdc'; const board = []; while (board.length < 3) { const c = deck[rand(13)] + suits[rand(4)]; if (!board.includes(c)) board.push(c); }
  let spot; try { spot = fs.defineSpot({ board: board.join(''), pot: p.pot, stack: p.stack, oop: p.ranges.oop, ip: p.ranges.ip, ...TREE }); } catch { continue; }
  if (spot.estimate.bytes > +(process.env.MAXMB ?? 700) * 2 ** 20) continue;
  const t0 = Date.now(); const nodes = treeOf(fs, spot); const counts = Array.from(spot.runouts.counts);
  const solve = fs.createRun(spot, { isomorphism: false, workers: +(process.env.WORKERS ?? 4) }); let ex = 9; while (ex > 0.1 && solve.completed < 1500) { solve.step(10); ex = solve.exploitabilityPercent(); }
  const solved = solve.snapshot(); const fresh = () => fs.createRun(spot, { analysisOnly: true, isomorphism: false }); const pot = spot.potUnits / spot.chipScale; const lossOf = (run) => 100 * run.solver.exploitability() / pot;
  const same = fresh(); copySolved(solved, same, nodes, counts, 0); copySolved(solved, same, nodes, counts, 1);
  const row = { spot: `${p.action}-${p.oop}-${p.ip}`, action: p.action, board: board.join(''), spr: +(p.stack / p.pot).toFixed(1), solved: +ex.toFixed(3), copied: +lossOf(same).toFixed(3), boards: counts };
  // one walk writes the river into three runs: both seats on the formulas, and each seat alone against the solver
  const both = fresh(); const alone = [0, 1].map((seat) => { const run = fresh(); copySolved(solved, run, nodes, counts, 1 - seat); return run; });
  const strategy = formulaStrategy(spot, nodes, [{ write: writer(both), players: [0, 1] }, { write: writer(alone[0]), players: [0] }, { write: writer(alone[1]), players: [1] }]);
  writeFormulas(both, strategy.early, [0, 1]); row.derived = +lossOf(both).toFixed(2); row.decisions = strategy.count;
  for (const seat of [0, 1]) {
    const tag = `derived_${seat ? 'ip' : 'oop'}`; writeFormulas(alone[seat], strategy.early, [seat]); row[tag] = +(2 * lossOf(alone[seat])).toFixed(2); row[`${tag}_eq`] = +(100 * (solved.ev(seat) - alone[seat].snapshot().ev(seat)) / pot).toFixed(2);
    let before = 0; for (const [name, rounds] of [['flop', [0]], ['turn', [0, 1]]]) { const part = fresh(); copySolved(solved, part, nodes, counts, 0); copySolved(solved, part, nodes, counts, 1); writeFormulas(part, strategy.early, [seat], rounds); const upTo = 100 * (solved.ev(seat) - part.snapshot().ev(seat)) / pot; row[`${tag}_eq_${name}`] = +(upTo - before).toFixed(2); before = upTo; }
    row[`${tag}_eq_river`] = +(row[`${tag}_eq`] - before).toFixed(2);
  }
  row.seconds = Math.round((Date.now() - t0) / 1000); appendFileSync(out, JSON.stringify(row) + '\n'); done++;
  console.error(`${row.spot} ${row.board}: solved ${row.solved} copied ${row.copied} | derived gives up oop ${row.derived_oop_eq} (flop ${row.derived_oop_eq_flop}, turn ${row.derived_oop_eq_turn}, river ${row.derived_oop_eq_river}), ip ${row.derived_ip_eq} (flop ${row.derived_ip_eq_flop}, turn ${row.derived_ip_eq_turn}, river ${row.derived_ip_eq_river}); to a best response oop ${row.derived_oop}, ip ${row.derived_ip} | ${row.decisions} decisions, ${row.seconds}s`);
}
