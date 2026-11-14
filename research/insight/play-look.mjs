// Descriptive, not predictive. The explanation layer has the solved solution in front of it, so the rule that explains a
// hand may read off exactly what the other player does: his range at every decision, and how each part of it answers.
//
// The rule tested here is the plainest one a person would give for a hand: look one move ahead.
//   fold      nothing more won or lost
//   call      the hand's equity against the range that bet, of the pot as it will be, less the call
//   check     behind him: its equity against his range. Before him: he checks some of his range (equity against that),
//             and bets the rest (then the better of folding and calling, as above)
//   bet or raise   he folds part of his range: the pot is won. He calls with part: equity against that part, of the
//             bigger pot, less the wager. He raises with part: the better of folding and calling it.
// Every frequency and every range in that is his, from the solution. The only thing assumed is that equity stands in for
// what the later streets are worth. Each hand takes the action that comes out best.
//
// The test: one seat plays by that rule against the solver's own strategy in the other seat, and the solver scores what
// it gives up. If that is small, "fold equity plus equity when called, against what he actually does" is an adequate
// explanation of the solution; where it is not, the explanation is missing something, and the street-by-street split
// says where.
//   node play-look.mjs [spots] [seed]      ROOT=turn for turn spots of the collection
import { writeFileSync, appendFileSync, readFileSync } from 'node:fs';
import * as fs from 'poker-flopsolve';
import { treeOf, equityVs } from '../../src/solver/flopsolve.js';
import { PRESETS } from '../../web/presets.js';
const N = fs.COMBOS; const CA = (c) => fs.COMBO_CARDS[2 * c]; const CB = (c) => fs.COMBO_CARDS[2 * c + 1]; const seatOf = (n) => (n.seat === 'ip' || n.seat === 1 ? 1 : 0);
const STRIDE = +(process.env.STRIDE ?? 1);   // with DEEP: look at every STRIDE-th card of the next street, to save time
const DEEP = +(process.env.DEEP ?? 0);   // 0: reaching the river is worth the hand's equity. 1: it is worth what the same rule makes of every river card, against what he does there
function writer(run) {
  const ctx = run.solver.ctx; const L = ctx.active; const lay = ctx.layout;
  return (node, board, probsOf) => { const owner = ctx.tree.player[node]; const actions = ctx.tree.numEdges[node]; const slot = (L.roundBase[ctx.tree.round[node]] + board) * 2 + owner; const from = L.start[slot]; const count = L.count[slot]; const at = lay.offset[node] + actions * lay.rowStart[slot]; for (let i = 0; i < count; i++) { const p = probsOf(L.memberCombo[L.memberStart[from + i]]); for (let a = 0; a < actions; a++) ctx.strategySum[at + i + a * count] = p[a]; } };
}
function copySolved(solved, target, nodes, counts, player) {
  const write = writer(target);
  for (const n of nodes) { if (n.kind !== 'decision' || seatOf(n) !== player) continue; for (let b = 0; b < counts[n.round]; b++) { const view = solved.strategyAt(n.id, b); const row = new Map(Array.from(view.combos).map((c, i) => [c, i])); const k = view.actions.length; write(n.id, b, (combo) => { const i = row.get(combo); return Array.from({ length: k }, (_, a) => (i == null ? 1 / k : view.probs[i * k + a])); }); } }
}
/** For a range, how much of it a hand leaves possible (his hands that share a card are out). */
function liveMass(range) {
  let all = 0; const card = new Float64Array(52); for (let c = 0; c < N; c++) { const w = range[c]; if (w > 0) { all += w; card[CA(c)] += w; card[CB(c)] += w; } }
  return (c) => Math.max(0, all - card[CA(c)] - card[CB(c)] + range[c]);
}
/**
 * One seat's play by the one-move rule over the whole spot, the other seat as the solver has it. Written into `run`
 * for the streets from `from` on (the solver's own play before that). Returns how many decisions were made by the rule.
 */
function lookAhead(spot, nodes, solved, run, seat, from, stats) {
  const R = spot.runouts; const ids = Array.from({ length: N }, (_, c) => c); const write = writer(run); const pot0 = nodes[0].pot; let count = 0;
  const start = [0, 1].map((p) => { const w = new Float64Array(N); const pl = spot.players[p]; Array.from(pl.combos).forEach((c, i) => { w[c] = pl.weights.length === N ? pl.weights[c] : pl.weights[i]; }); return w; });
  const viewOf = (id, b) => { const v = solved.strategyAt(id, b); const row = new Int32Array(N).fill(-1); Array.from(v.combos).forEach((c, i) => { row[c] = i; }); return { k: v.actions.length, p: (c, a) => (row[c] < 0 ? 0 : v.probs[row[c] * v.actions.length + a]) }; };
  // Everything below is in chips, net of all the seat has put in since the spot began, so that actions compare directly.
  const net = (eq, invested) => (Number.isNaN(eq) ? -invested : eq * (pot0 + 2 * invested) - invested);
  const maskOf = (hands) => { const m = new Float64Array(N); for (const c of hands) m[c] = 1; return m; };
  /** How many real cards each stored board of the next street stands for, from one board (mirrored runouts are stored once). */
  const weightsCache = new Map();
  const childWeights = (board, bIndex, next) => {
    const key = `${next}|${bIndex}`; let w = weightsCache.get(key); if (w) return w; w = new Map();
    for (let card = 0; card < 52; card++) { if (board.includes(card)) continue; const k = spot.resolveBoard([...board, card]).board; w.set(k, (w.get(k) ?? 0) + 1); }
    weightsCache.set(key, w); return w;
  };
  /**
   * What reaching a new street (or a showdown) is worth: equity of the pot; or with `deep`, what the same rule makes of
   * the next street on every card that can come (a sample of them when STRIDE is set), against what he does there.
   */
  const arrive = (nodeId, board, bIndex, his, hands, invested, deep) => {
    const n = nodes[nodeId]; const out = new Float64Array(N);
    if (n.kind !== 'chance' || deep <= 0 || board.length === 5) { const eq = equityVs(fs, board, maskOf(hands), his); for (const c of hands) out[c] = net(eq[c], invested); return out; }
    const next = nodes[n.edges[0].child].round; const seenCards = new Float64Array(N); const w = R.width[next]; const weights = childWeights(board, bIndex, next); let at = 0;
    for (let k = R.childStart[next][bIndex]; k < R.childStart[next][bIndex + 1]; k++) {
      if (STRIDE > 1 && (at++ % STRIDE)) continue;
      const cards = Array.from(R.cards[next].subarray(k * w, k * w + w)); const card = cards.find((c) => !board.includes(c)); const live = hands.filter((c) => CA(c) !== card && CB(c) !== card); if (!live.length) continue; const wt = weights.get(k) ?? 1;
      const hisNext = Float64Array.from(his); for (let c = 0; c < N; c++) if (CA(c) === card || CB(c) === card) hisNext[c] = 0;
      const v = bestAt(n.edges[0].child, [...board, card], k, hisNext, live, deep - 1); for (const c of live) { out[c] += wt * v[c]; seenCards[c] += wt; }
    }
    for (const c of hands) out[c] = seenCards[c] > 0 ? out[c] / seenCards[c] : -invested; return out;
  };
  /** The value of each action at one of the seat's decisions, hand by hand, by the one-move rule. */
  const valuesAt = (id, board, bIndex, his, hands, deep) => {
    const n = nodes[id]; const p = seatOf(n); const me = n.invested[p]; const him = n.invested[1 - p]; const liveAll = liveMass(his);
    const split = (child) => { const v = viewOf(child, bIndex); return nodes[child].edges.map((e, b) => { const r = new Float64Array(N); for (let c = 0; c < N; c++) if (his[c] > 0) r[c] = his[c] * v.p(c, b); return { edge: e, range: r, live: liveMass(r) }; }); };
    return n.edges.map((edge) => {
      const child = nodes[edge.child]; const to = child.invested ? child.invested[p] : me; const V = new Float64Array(N);
      if (edge.kind === 'fold') { for (const c of hands) V[c] = -me; return V; }
      if (child.kind !== 'decision') return arrive(edge.child, board, bIndex, his, hands, Math.max(to, him), deep);   // a call, or a check that ends the street
      for (const part of split(edge.child)) {
        const kind = part.edge.kind; const after = nodes[part.edge.child]; const hisTo = after.invested ? after.invested[1 - p] : him; let got = null;
        for (const c of hands) {
          const all = liveAll(c); if (!(all > 0)) continue; const share = part.live(c) / all; if (share <= 0) continue;
          if (kind === 'fold') { V[c] += share * (pot0 + him); continue; }
          if (kind === 'check' || kind === 'call') { got ??= arrive(part.edge.child, board, bIndex, part.range, hands, Math.max(to, hisTo), deep); V[c] += share * got[c]; }
          else { if (!got) { const mineThere = nodes[part.edge.child]; const call = mineThere.kind === 'decision' ? mineThere.edges.find((x) => x.kind === 'call') : null; got = call ? arrive(call.child, board, bIndex, part.range, hands, hisTo, deep) : arrive(part.edge.child, board, bIndex, part.range, hands, hisTo, 0); } V[c] += share * Math.max(-to, got[c]); }   // he bets or raises: fold what has gone in, or call (equity of that pot)
        }
      }
      return V;
    });
  };
  /** The best the seat can do from the first decision of a street, whoever acts first there. */
  const bestAt = (id, board, bIndex, his, hands, deep) => {
    const n = nodes[id]; const out = new Float64Array(N);
    if (n.kind !== 'decision') { const eq = equityVs(fs, board, maskOf(hands), his); const inv = Math.max(...n.invested); for (const c of hands) out[c] = net(eq[c], inv); return out; }
    if (seatOf(n) === seat) { const vals = valuesAt(id, board, bIndex, his, hands, deep); for (const c of hands) { let b = -Infinity; for (const v of vals) b = Math.max(b, v[c]); out[c] = b; } return out; }
    // he acts first: each of his actions leads to a decision of ours (or straight on)
    const v = viewOf(id, bIndex); const liveAll = liveMass(his);
    n.edges.forEach((e, b) => { const r = new Float64Array(N); for (let c = 0; c < N; c++) if (his[c] > 0) r[c] = his[c] * v.p(c, b); const live = liveMass(r); const sub = bestAt(e.child, board, bIndex, r, hands, deep); for (const c of hands) { const all = liveAll(c); if (all > 0) out[c] += (live(c) / all) * sub[c]; } });
    return out;
  };
  const walk = (id, board, bIndex, reach) => {
    const n = nodes[id];
    if (n.kind === 'chance') { const next = nodes[n.edges[0].child].round; for (let k = R.childStart[next][bIndex]; k < R.childStart[next][bIndex + 1]; k++) { const w = R.width[next]; const cards = Array.from(R.cards[next].subarray(k * w, k * w + w)); const card = cards.find((c) => !board.includes(c)); walk(n.edges[0].child, [...board, card], k, reach.map((r) => { const o = Float64Array.from(r); for (let c = 0; c < N; c++) if (CA(c) === card || CB(c) === card) o[c] = 0; return o; })); } return; }
    if (n.kind !== 'decision') return;
    const p = seatOf(n); const kinds = n.edges.map((x) => x.kind); const k = kinds.length; const mine = reach[p]; const hands = ids.filter((c) => mine[c] > 0); if (!hands.length) return;
    const view = viewOf(id, bIndex); let probs;
    const KIND = process.env.ONLYKIND ?? '';   // the rule at one kind of decision before the river only: 'act' or 'face'
    const skip = board.length < 5 && ((KIND === 'act' && n.invested[1 - p] > n.invested[p]) || (KIND === 'face' && n.invested[1 - p] <= n.invested[p]));
    if (p !== seat || n.round < from || skip) probs = (c, a) => view.p(c, a);
    else {
      count++; const his = reach[1 - p]; const value = valuesAt(id, board, bIndex, his, hands, DEEP); const me = n.invested[p]; const him = n.invested[1 - p];
      // each hand takes what comes out best; hands within a hair of level share
      const pick = new Map(); for (const c of hands) { let best = -Infinity; for (let a = 0; a < k; a++) best = Math.max(best, value[a][c]); const tol = 1e-9 + 0.002 * n.pot; const top = []; for (let a = 0; a < k; a++) if (value[a][c] >= best - tol) top.push(a); pick.set(c, top); }
      probs = (c, a) => { const t = pick.get(c); return t && t.includes(a) ? 1 / t.length : 0; };
      write(id, bIndex, (c) => (pick.has(c) ? Array.from({ length: k }, (_, a) => probs(c, a)) : Array.from({ length: k }, (_, a) => view.p(c, a))));
      if (stats) { const W = hands.reduce((t, c) => t + mine[c], 0); const key = `${['flop', 'turn', 'river'][board.length - 3]}|${him > me ? 'facing' : 'to act'}`; const g = stats[key] ??= { n: 0, agree: 0 }; g.n++; let same = 0; for (const c of hands) { let s = 0; for (let a = 0; a < k; a++) s += Math.min(probs(c, a), view.p(c, a)); same += mine[c] * s; } g.agree += same / W; }
    }
    n.edges.forEach((edge, a) => { const next = [reach[0], reach[1]]; const r = new Float64Array(N); let any = false; for (const c of hands) { const v = mine[c] * probs(c, a); r[c] = v; if (v > 0) any = true; } if (!any) return; next[p] = r; walk(edge.child, board, bIndex, next); });
  };
  walk(0, Array.from(spot.board), 0, start);
  return count;
}

const [count = '12', seed = '31'] = process.argv.slice(2);
let a = (+seed * 2654435761) >>> 0; const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; const rand = (k) => Math.floor(rnd() * k);
const ROOT = process.env.ROOT ?? 'flop'; const pool = PRESETS.filter((p) => p.action !== 'Limped' && (!process.env.ONLY || process.env.ONLY.split(',').includes(p.action)));
const TREE = ROOT === 'turn' ? { betSizes: [[0.5, 1], [0.5, 1]], raiseSizes: [{ times: 3 }], maxRaises: 2, allInThreshold: 0.67 } : { betSizes: [[0.33, 1], [0.5, 1], [0.5, 1]], raiseSizes: [{ times: 3 }], maxRaises: 2, allInThreshold: 0.67 };
const out = new URL(`./out/look${process.env.TAG ? `-${process.env.TAG}` : ''}.jsonl`, import.meta.url); writeFileSync(out, ''); let done = 0;
const turns = []; if (ROOT === 'turn') { const seenT = new Set(); for (const sd of (process.env.FROM ?? '9,7,8').split(',')) { let text; try { text = readFileSync(new URL(`./out/hands-${sd}.jsonl`, import.meta.url), 'utf8'); } catch { continue; } for (const l of text.split('\n')) { if (!l.includes('|first"')) continue; const d = JSON.parse(l); if (d.board.replace(/ /g, '').length !== 8 || !/^(xx|bc\d|xbc\d)\|first$/.test(d.line) || d.toCall > 0 || !d.vr || Math.min(...d.reach) < 0.25) continue; const spr = d.behind / d.pot; if (spr < +(process.env.MINSPR ?? 0) || spr > +(process.env.MAXSPR ?? 99)) continue; const key = `${d.spot}|${d.line.replace(/\d/, '')}`; if (seenT.has(key)) continue; seenT.add(key); turns.push(d); } } for (let i = turns.length - 1; i > 0; i--) { const j = rand(i + 1); [turns[i], turns[j]] = [turns[j], turns[i]]; } }
while (done < +count) {
  let spot; let p; let board;
  if (ROOT === 'turn') { const d = turns.shift(); if (!d) break; const oop = d.hands.filter((h) => h.w > 0.01).map((h) => `${h.h}:${h.w}`).join(','); const ip = d.vr.filter((v) => v[1] > 0.01).map((v) => `${v[0]}:${v[1]}`).join(','); p = { action: d.action, oop: d.oop, ip: d.ip, pot: d.pot, stack: Math.max(d.behind, 1), line: d.line }; board = d.board.replace(/ /g, ''); try { spot = fs.defineSpot({ board, pot: p.pot, stack: p.stack, oop, ip, ...TREE }); } catch { continue; } }
  else { p = pool[rand(pool.length)]; const deck = 'AKQJT98765432', suits = 'shdc'; const b = []; while (b.length < 3) { const c = deck[rand(13)] + suits[rand(4)]; if (!b.includes(c)) b.push(c); } board = b.join(''); try { spot = fs.defineSpot({ board, pot: p.pot, stack: p.stack, oop: p.ranges.oop, ip: p.ranges.ip, ...TREE }); } catch { continue; } if (spot.estimate.bytes > +(process.env.MAXMB ?? 700) * 2 ** 20) continue; }
  const t0 = Date.now(); const nodes = treeOf(fs, spot); const counts = Array.from(spot.runouts.counts); const streets = counts.length;
  const solve = fs.createRun(spot, { isomorphism: false, workers: +(process.env.WORKERS ?? 4) }); let ex = 9; const target = ROOT === 'turn' ? 0.03 : 0.1; while (ex > target && solve.completed < (ROOT === 'turn' ? 4000 : 1500)) { solve.step(10); ex = solve.exploitabilityPercent(); }
  const solved = solve.snapshot(); const pot = spot.potUnits / spot.chipScale; const names = streets === 3 ? ['flop', 'turn', 'river'] : ['turn', 'river'];
  const row = { spot: `${p.action}-${p.oop}-${p.ip}`, action: p.action, line: p.line, board, spr: +(p.stack / p.pot).toFixed(1), solved: +ex.toFixed(3), stats: {} };
  for (const seat of [0, 1]) {
    const tag = seat ? 'ip' : 'oop'; let later = 0;
    // the rule from each street on (the solver's own play before it): the last street alone, then one more, then all
    for (let from = streets - 1; from >= 0; from--) {
      const run = fs.createRun(spot, { analysisOnly: true, isomorphism: false }); copySolved(solved, run, nodes, counts, 0); copySolved(solved, run, nodes, counts, 1);
      row.decisions = lookAhead(spot, nodes, solved, run, seat, from, from === 0 ? row.stats : null); const loss = 100 * (solved.ev(seat) - run.snapshot().ev(seat)) / pot;
      row[`${tag}_${names[from]}`] = +(loss - later).toFixed(2); later = loss; if (from === 0) { row[tag] = +loss.toFixed(2); row[`${tag}_br`] = +(200 * run.solver.exploitability() / pot).toFixed(1); }
    }
  }
  for (const g of Object.values(row.stats)) g.agree = +(g.agree / g.n).toFixed(3);
  row.seconds = Math.round((Date.now() - t0) / 1000); appendFileSync(out, JSON.stringify(row) + '\n'); done++;
  console.error(`${row.spot} ${board} ${p.line ?? ''}: gives up oop ${row.oop} (${names.map((s) => `${s} ${row[`oop_${s}`]}`).join(', ')}), ip ${row.ip} (${names.map((s) => `${s} ${row[`ip_${s}`]}`).join(', ')}) | ${row.seconds}s`);
}
