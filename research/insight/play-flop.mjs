// The play test from the flop: the formulas as a whole strategy over the flop, every turn and every river, scored by the
// solver. One seat on the formulas and the other on the solver's equilibrium gives what that seat gives up to a sound
// opponent, and what a perfect best response wins from it; the formulas on one street only (the solver's play on the
// others) says where it is lost.
//   node play-flop.mjs [spots] [seed]     -> out/play-flop.jsonl
import { writeFileSync, appendFileSync } from 'node:fs';
import * as fs from 'poker-flopsolve';
import { treeOf } from '../../src/solver/flopsolve.js';
import { PRESETS } from '../../web/lib/study/presets.js';
import { betting, folding } from './formulas.mjs';
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
/** The formula strategy at every decision and board of the spot: a list of { node, board, seat, round, ids, probs } with probs by hand then action. */
function formulaStrategy(spot, nodes, kind) {
  const R = spot.runouts; const ids = Array.from({ length: N }, (_, c) => c); const out = [];
  const start = [0, 1].map((p) => { const w = new Float64Array(N); const pl = spot.players[p]; Array.from(pl.combos).forEach((c, i) => { w[c] = pl.weights.length === N ? pl.weights[c] : pl.weights[i]; }); return w; });
  const walk = (id, board, bIndex, reach, expectFold) => {
    const n = nodes[id];
    if (n.kind === 'chance') {
      const next = board.length - 2;   // the round the card opens: 1 the turn, 2 the river
      for (let k = R.childStart[next][bIndex]; k < R.childStart[next][bIndex + 1]; k++) {
        const w = R.width[next]; const cards = Array.from(R.cards[next].subarray(k * w, k * w + w)); const card = cards.find((c) => !board.includes(c));
        const dealt = reach.map((r) => { const o = Float64Array.from(r); for (let c = 0; c < N; c++) if (CA(c) === card || CB(c) === card) o[c] = 0; return o; });
        walk(n.edges[0].child, [...board, card], k, dealt, null);
      }
      return;
    }
    if (n.kind !== 'decision') return;
    const p = seatOf(n); const mine = reach[p]; const his = reach[1 - p]; const river = board.length === 5; const toCall = n.invested[1 - p] - n.invested[p]; const kinds = n.edges.map((x) => x.kind); const k = kinds.length;
    const live = ids.filter((c) => mine[c] > 0); const probs = new Float32Array(live.length * k); let passDown = null;
    if (toCall > 0) {
      const s = toCall / (n.pot - toCall); const fold = folding('derived', board, mine, his, ids, expectFold ?? s / (1 + s), s); const fi = kinds.indexOf('fold'); const ci = kinds.indexOf('call');
      live.forEach((c, i) => { if (fi >= 0) probs[i * k + fi] = fold[c]; probs[i * k + ci] = 1 - (fi >= 0 ? fold[c] : 0); });
    } else {
      const bi = kinds.findIndex((x) => x === 'bet' || x === 'allin'); const xi = kinds.indexOf('check');
      if (bi < 0) live.forEach((c, i) => { probs[i * k + xi] = 1; });
      else { const s = (nodes[n.edges[bi].child].invested[p] - n.invested[p]) / n.pot; const first = n.parent < 0 || nodes[n.parent].kind === 'chance'; const t = betting(kind === 'equity' ? 'equity' : 'derived', board, mine, his, ids, s, first && kind !== 'equity', river); passDown = t.fold; live.forEach((c, i) => { probs[i * k + bi] = t.bet[c]; probs[i * k + xi] = 1 - t.bet[c]; }); }
    }
    out.push({ node: id, board: bIndex, seat: p, round: n.round, ids: Int16Array.from(live), probs, k });
    n.edges.forEach((edge, a) => { const next = [reach[0], reach[1]]; const mineNext = new Float64Array(N); live.forEach((c, i) => { mineNext[c] = mine[c] * probs[i * k + a]; }); next[p] = mineNext; walk(edge.child, board, bIndex, next, kinds[a] === 'bet' || kinds[a] === 'allin' ? passDown : null); });
  };
  walk(0, Array.from(spot.board), 0, start, null);
  return out;
}
function writeFormulas(run, strategy, players, rounds = [0, 1, 2]) {
  const write = writer(run); const at = new Int32Array(N);
  for (const s of strategy) { if (!players.includes(s.seat) || !rounds.includes(s.round)) continue; at.fill(-1); s.ids.forEach((c, i) => { at[c] = i; }); const passive = Array.from({ length: s.k }, (_, a) => (a === 0 ? 1 : 0)); write(s.node, s.board, (c) => (at[c] < 0 ? passive : Array.from({ length: s.k }, (_, a) => s.probs[at[c] * s.k + a]))); }
}

const [count = '12', seed = '31'] = process.argv.slice(2);
let a = (+seed * 2654435761) >>> 0; const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; const rand = (k) => Math.floor(rnd() * k);
const pool = PRESETS.filter((p) => p.action !== 'Limped' && (!process.env.ONLY || p.action === process.env.ONLY)); const TREE = { betSizes: [[0.75], [0.75], [0.75]], maxRaises: 1 };
const out = new URL(`./out/play-flop${process.env.TAG ? `-${process.env.TAG}` : ''}.jsonl`, import.meta.url); writeFileSync(out, ''); let done = 0;
while (done < +count) {
  const p = pool[rand(pool.length)]; const deck = 'AKQJT98765432', suits = 'shdc'; const board = []; while (board.length < 3) { const c = deck[rand(13)] + suits[rand(4)]; if (!board.includes(c)) board.push(c); }
  let spot; try { spot = fs.defineSpot({ board: board.join(''), pot: p.pot, stack: p.stack, oop: p.ranges.oop, ip: p.ranges.ip, ...TREE }); } catch { continue; }
  if (spot.estimate.bytes > +(process.env.MAXMB ?? 700) * 2 ** 20) continue;
  const t0 = Date.now(); const nodes = treeOf(fs, spot); const counts = Array.from(spot.runouts.counts);
  const solve = fs.createRun(spot, { isomorphism: false, workers: +(process.env.WORKERS ?? 4) }); let ex = 9; while (ex > 0.1 && solve.completed < 1500) { solve.step(10); ex = solve.exploitabilityPercent(); }
  const solved = solve.snapshot(); const fresh = () => fs.createRun(spot, { analysisOnly: true, isomorphism: false }); const pot = spot.potUnits / spot.chipScale; const lossOf = (run) => 100 * run.solver.exploitability() / pot;
  const same = fresh(); copySolved(solved, same, nodes, counts, 0); copySolved(solved, same, nodes, counts, 1);
  const row = { spot: `${p.action}-${p.oop}-${p.ip}`, action: p.action, board: board.join(''), spr: +(p.stack / p.pot).toFixed(1), solved: +ex.toFixed(3), copied: +lossOf(same).toFixed(3), boards: counts };
  for (const kind of ['derived', 'equity']) {
    const strategy = formulaStrategy(spot, nodes, kind);
    const both = fresh(); writeFormulas(both, strategy, [0, 1]); row[kind] = +lossOf(both).toFixed(2);
    for (const seat of [0, 1]) {
      const tag = `${kind}_${seat ? 'ip' : 'oop'}`; const one = fresh(); copySolved(solved, one, nodes, counts, 1 - seat); writeFormulas(one, strategy, [seat]); row[tag] = +(2 * lossOf(one)).toFixed(2); row[`${tag}_eq`] = +(100 * (solved.ev(seat) - one.snapshot().ev(seat)) / pot).toFixed(2);
            if (kind === 'derived') {
        // street by street: the formulas on the flop alone, then on the flop and turn; each step adds that street's share
        let before = 0; for (const [name, rounds] of [['flop', [0]], ['turn', [0, 1]]]) { const part = fresh(); copySolved(solved, part, nodes, counts, 0); copySolved(solved, part, nodes, counts, 1); writeFormulas(part, strategy, [seat], rounds); const upTo = 100 * (solved.ev(seat) - part.snapshot().ev(seat)) / pot; row[`${tag}_eq_${name}`] = +(upTo - before).toFixed(2); before = upTo; }
        row[`${tag}_eq_river`] = +(row[`${tag}_eq`] - before).toFixed(2);
      }
    }
  }
  row.seconds = Math.round((Date.now() - t0) / 1000); appendFileSync(out, JSON.stringify(row) + '\n'); done++;
  console.error(`${row.spot} ${row.board}: solved ${row.solved} copied ${row.copied} | derived gives up oop ${row.derived_oop_eq} (flop ${row.derived_oop_eq_flop}, turn ${row.derived_oop_eq_turn}, river ${row.derived_oop_eq_river}), ip ${row.derived_ip_eq} (flop ${row.derived_ip_eq_flop}, turn ${row.derived_ip_eq_turn}, river ${row.derived_ip_eq_river}); to a best response oop ${row.derived_oop}, ip ${row.derived_ip} | equity ruler oop ${row.equity_oop_eq}, ip ${row.equity_ip_eq} | ${row.seconds}s`);
}
