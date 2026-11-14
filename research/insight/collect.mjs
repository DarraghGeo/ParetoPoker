// The raw material for hunting hand-reading ideas: realistic ranges by position, random flops, and at every flop
// decision worth looking at (and a few turns) each hand's cards, strength, draws, blockers and play.
//   node collect.mjs <seed> <spots>   -> out/hands-<seed>.jsonl (one line a decision, hands inside)
import { writeFileSync, appendFileSync } from 'node:fs';
import { fs } from '../proof/lib.mjs';
import { treeOf, equityVs } from '../../src/solver/flopsolve.js';
import { PRESETS } from '../../web/presets.js';
import { study } from '../../src/explain/street.js';
import { evaluator } from '../../src/explain/best.js';
const [seed = '1', count = '40'] = process.argv.slice(2);
const TREE = { betSizes: [[0.33, 0.75, 1.25], [0.75], [0.75]], raiseSizes: [{ times: 3 }], maxRaises: [2, 1, 1], allInThreshold: 0.67 };
let a = (+seed * 2654435761) >>> 0; const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; const rand = (k) => Math.floor(rnd() * k);
const pool = PRESETS.filter((p) => p.action !== 'Limped' && (!process.env.ONLY || p.action === process.env.ONLY));
const N = fs.COMBOS; const A = (c) => fs.COMBO_CARDS[2 * c]; const B = (c) => fs.COMBO_CARDS[2 * c + 1];
const clash = (h, v) => A(h) === A(v) || A(h) === B(v) || B(h) === A(v) || B(h) === B(v);
const r4 = (x) => (x == null || Number.isNaN(x) ? null : +x.toFixed(4));
const file = new URL(`./out/hands-${seed}.jsonl`, import.meta.url); writeFileSync(file, '');
/** One decision: the spot it is in, and every hand that reaches it. */
function record(g, meta, id, dealt, line, withValue) {
  const st = study(fs, g.solution, g.nodes, id, dealt); if (!st) return null;
  const f = st.f; const eq = st.equity(); const parts = st.drawParts(); const cards = st.spread();
  const his = equityVs(fs, f.board, f.his, f.mine);
  // his strong hands: the top third of his range by equity against ours
  const order = []; let all = 0; for (let v = 0; v < N; v++) if (f.his[v] > 0 && !Number.isNaN(his[v])) { order.push(v); all += f.his[v]; }
  order.sort((x, y) => his[y] - his[x]); const top = new Float64Array(N); let seen = 0; for (const v of order) { if (seen >= all / 3) break; top[v] = f.his[v]; seen += f.his[v]; }
  const eqTop = equityVs(fs, f.board, f.mine, top);
  // what he does to each bet, seen through each of our hands' cards
  const replies = f.node.edges.map((e) => { const child = g.nodes[e.child]; if (child.kind !== 'decision' || e.kind === 'check' || e.kind === 'call' || e.kind === 'fold') return null; const s2 = study(fs, g.solution, g.nodes, e.child, dealt); if (!s2) return null; const kinds = child.edges.map((x) => x.kind); const vs = []; for (let v = 0; v < N; v++) if (s2.f.mine[v] > 0) vs.push(v); return { s2, kinds, vs }; });
  const through = (c, r) => { let w = 0, fold = 0, raise = 0; for (const v of r.vs) { if (clash(c, v)) continue; const m = r.s2.f.mine[v]; w += m; r.kinds.forEach((k, i) => { const p = r.s2.sigma(v, i); if (k === 'fold') fold += m * p; else if (k !== 'call') raise += m * p; }); } return w > 0 ? [r4(fold / w), r4(raise / w)] : [null, null]; };
  let values = null; if (withValue) { try { values = evaluator(fs, g.solution, g.nodes)(f, 'average'); } catch { values = null; } }
  const hands = [];
  for (let c = 0; c < N; c++) {
    if (!(f.mine[c] > 0.002) || Number.isNaN(eq[c])) continue;
    const x = st.featuresOf(c); const p = f.node.edges.map((_, i) => r4(st.sigma(c, i)));
    let down = 0, up = 0, n = 0; for (const k of cards) { const e2 = k.eq[c]; if (e2 == null || Number.isNaN(e2)) continue; n++; if (e2 < eq[c]) down += eq[c] - e2; else up += e2 - eq[c]; }
    const h = { h: fs.formatCombo(c), w: r4(f.mine[c]), e: r4(eq[c]), now: r4(parts?.now[c]), draw: r4(parts?.draw[c]), top: r4(eqTop[c]), down: r4(n ? down / n : null), up: r4(n ? up / n : null), made: x.made, own: x.own, pair: x.pair, fo: x.flushOuts, so: x.straightOuts, p };
    h.re = replies.map((r) => (r ? through(c, r) : null));
    if (values) h.v = r4(values.reduce((t, v, i) => t + (p[i] > 0 ? p[i] * v[c] : 0), 0) / st.pot);
    hands.push(h);
  }
  return { ...meta, line, seat: f.me, board: fs.formatCards(f.board), pot: st.pot, toCall: st.toCall, behind: +(meta.stack - (Math.max(...f.node.invested) - Math.max(...g.nodes[0].invested))).toFixed(2), reach: st.lineReach.map(r4),
    actions: f.node.edges.map((e, i) => ({ kind: e.kind, label: e.label, freq: r4(st.actions[i].freq), add: g.nodes[e.child].invested[f.me] - f.node.invested[f.me] })), hands };
}
const used = new Set(); let done = 0;
while (done < +count) {
  const p = pool[rand(pool.length)]; const deck = 'AKQJT98765432', suits = 'shdc'; const board = []; while (board.length < 3) { const c = deck[rand(13)] + suits[rand(4)]; if (!board.includes(c)) board.push(c); }
  const key = `${p.action}-${p.oop}-${p.ip}`; const name = `${key} ${board.join('')}`; if (used.has(name)) continue; used.add(name);
  let spot; try { spot = fs.defineSpot({ board: board.join(''), pot: p.pot, stack: p.stack, oop: p.ranges.oop, ip: p.ranges.ip, ...TREE }); } catch { continue; }
  if (spot.estimate.bytes > +(process.env.MAXMB ?? 3200) * 2 ** 20) continue;
  const t0 = Date.now(); const run = fs.createRun(spot, { workers: +(process.env.WORKERS ?? 4) }); let e = 99;
  while (e > 0.3 && run.completed < 600 && Date.now() - t0 < 420000) { run.step(10); e = run.exploitabilityPercent(); }
  const g = { spot, solution: run.snapshot(), nodes: treeOf(fs, spot) }; const meta = { spot: name, pre: key, action: p.action, oop: p.oop, ip: p.ip, exploit: r4(e), stack: p.stack }; const out = [];
  const push = (x) => { if (x) out.push(JSON.stringify(x)); };
  const root = g.nodes[0]; const check = root.edges.find((x) => x.kind === 'check'); const afterCheck = check.child;
  push(record(g, meta, 0, [], 'first', true)); push(record(g, meta, afterCheck, [], 'x', true));
  // facing each bet that is made often enough
  const faced = (id, line) => { const st = study(fs, g.solution, g.nodes, id, []); g.nodes[id].edges.forEach((ed, i) => { if ((ed.kind === 'bet' || ed.kind === 'allin') && st.actions[i].freq >= 0.08 && g.nodes[ed.child].kind === 'decision') push(record(g, meta, ed.child, [], `${line}b${i}`, false)); }); };
  faced(0, ''); faced(afterCheck, 'x');
  // the turn, on three cards, after check-check and after the commonest bet is called
  const turnOf = (id) => { const n = g.nodes[id]; return n.kind === 'chance' ? n.edges[0].child : null; };
  const lines = []; const xx = g.nodes[afterCheck].edges.find((x) => x.kind === 'check'); if (xx) lines.push(['xx', turnOf(xx.child)]);
  for (const [from, tag] of [[0, 'bc'], [afterCheck, 'xbc']]) { const st = study(fs, g.solution, g.nodes, from, []); let best = -1; g.nodes[from].edges.forEach((ed, i) => { if (ed.kind === 'bet' && (best < 0 || st.actions[i].freq > st.actions[best].freq)) best = i; }); if (best < 0 || st.actions[best].freq < 0.1) continue; const call = g.nodes[g.nodes[from].edges[best].child].edges.find((x) => x.kind === 'call'); if (call) lines.push([`${tag}${best}`, turnOf(call.child)]); }
  const free = []; for (let c = 0; c < 52; c++) if (!spot.board.includes(c)) free.push(c);
  for (let k = 0; k < 3; k++) { const card = free.splice(rand(free.length), 1)[0]; for (const [tag, id] of lines) { if (id == null) continue; try { push(record(g, meta, id, [card], `${tag}|first`, false)); const n = g.nodes[id]; const ch = n.edges.find((x) => x.kind === 'check'); if (ch && g.nodes[ch.child].kind === 'decision') push(record(g, meta, ch.child, [card], `${tag}|x`, false)); } catch (err) { console.error('turn skip', name, String(err.message).slice(0, 80)); } } }
  if (out.length) appendFileSync(file, out.join('\n') + '\n'); done++;
  console.error(`  ${name} done (${e.toFixed(3)}%, ${run.completed} it, ${Math.round((Date.now() - t0) / 1000)}s, ${out.length} decisions)`);
}
