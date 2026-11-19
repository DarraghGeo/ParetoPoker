// Many small solves with the ranges changed in controlled ways, to look for rules in how often a range bets, folds and
// raises and in which part of each bar does it. The owner's Range Butterfly page does this by hand; this is the same
// solver run headless. Rivers only for now: one bet (three quarters of the pot) and one raise (to three times).
//   node research/engine/sweep.mjs <rivers> <seed>   -> out/sweep-<seed>.jsonl, one line a river
// Each line: the spot, both ranges as shares by hand row before the river is played, and at four decisions (out of
// position first, in position checked to, in position facing a bet, out of position facing a bet after checking) the
// range that gets there in ten equity bands and eight rows, with how often each part takes each action.
import { appendFileSync, writeFileSync } from 'node:fs';
import * as fs from 'poker-flopsolve';
import { treeOf } from '../../src/solver/flopsolve.js';
import { PRESETS } from '../../web/lib/study/presets.js';

const N = fs.COMBOS; const CA = (c) => fs.COMBO_CARDS[2 * c]; const CB = (c) => fs.COMBO_CARDS[2 * c + 1];
const RK = Array.from({ length: 52 }, (_, c) => fs.rankOf(c)); const SU = Array.from({ length: 52 }, (_, c) => fs.suitOf(c)); const ACE = Math.max(...RK); const LOW = Math.min(...RK);
const HIGHER = fs.evaluateCards(fs.parseCards('AsAh2c7d9h')) > fs.evaluateCards(fs.parseCards('3s4h2c7d9h')) ? 1 : -1;
const NAME = (c) => 'AKQJT98765432'[ACE - RK[c]] + 'shdc'[SU[c]];      // overwritten below from the solver's own card names
const [count = '200', seed = '1'] = process.argv.slice(2);
let a0 = (+seed * 2654435761) >>> 0; const rnd = () => { a0 = (a0 + 0x6d2b79f5) >>> 0; let t = a0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; const pick = (xs) => xs[Math.floor(rnd() * xs.length)];

const straightTop = (have) => { for (let top = ACE; top >= LOW + 3; top--) { let ok = true; for (let k = 0; k < 5 && ok; k++) { const r = top - k; ok = r < LOW ? have[ACE] : have[r]; } if (ok) return top; } return -1; };
/** Each hand's row on a river board (0 nothing, 2 low pair, 3 middle pair, 4 top pair, 5 overpair, 6 two pair, 7 trips or better) and its strength. */
function rowsOf(board) {
  const lv = new Int8Array(N).fill(-1); const str = new Float64Array(N); const bs = [0, 0, 0, 0]; const br = new Uint8Array(16); const taken = new Uint8Array(52); for (const c of board) { bs[SU[c]]++; br[RK[c]]++; taken[c] = 1; }
  const tops = [...new Set(board.map((c) => RK[c]))].sort((x, y) => y - x); const top = tops[0]; const second = tops[1] ?? -1; const have = new Uint8Array(16); for (const c of board) have[RK[c]] = 1; const boardStraight = straightTop(have);
  for (let c = 0; c < N; c++) {
    const a = CA(c), b = CB(c); if (taken[a] || taken[b]) continue; const ra = RK[a], rb = RK[b]; str[c] = HIGHER * fs.evaluateCards([...board, a, b]);
    const h = Uint8Array.from(have); h[ra] = 1; h[rb] = 1; const st = straightTop(h); let level = 0;
    const flush = [SU[a], SU[b]].some((s) => bs[s] < 5 && bs[s] + (SU[a] === s) + (SU[b] === s) >= 5); const trips = br[ra] + 1 + (ra === rb) >= 3 || br[rb] + 1 + (ra === rb) >= 3;
    if (flush || st > boardStraight || trips) level = 7; else if (ra !== rb && br[ra] && br[rb]) level = 6; else if (ra === rb) level = ra > top ? 5 : ra >= second ? 3 : 2;
    else if (br[ra] || br[rb]) { const hit = br[ra] ? ra : rb; level = hit === top ? 4 : hit === second ? 3 : 2; }
    lv[c] = level;
  }
  return { lv, str };
}
/** Each hand's equity against a weighted range on the river, his hands that share a card left out. */
function equity(F, mine, his) {
  const hs = []; for (let c = 0; c < N; c++) if (his[c] > 0 && F.lv[c] >= 0) hs.push(c); const e = new Float32Array(N);
  for (let c = 0; c < N; c++) { if (!(mine[c] > 0) || F.lv[c] < 0) continue; const a = CA(c), b = CB(c); let win = 0, all = 0;
    for (const v of hs) { const x = CA(v), y = CB(v); if (x === a || x === b || y === a || y === b) continue; const w = his[v]; all += w; win += F.str[c] > F.str[v] ? w : F.str[c] === F.str[v] ? w / 2 : 0; }
    e[c] = all > 0 ? win / all : 0.5; }
  return e;
}
const SHAPES = ['as dealt', 'capped', 'polar', 'condensed', 'random', 'random', 'strong', 'weak'];
/** A row-by-row keep share that turns a starting range into one a line of play might leave. */
function sculpt(shape) {
  const k = new Float64Array(8).fill(1);
  if (shape === 'capped') { k[7] = 0.1; k[6] = 0.2; k[5] = 0.5; } else if (shape === 'polar') { k[2] = 0.2; k[3] = 0.15; k[4] = 0.4; } else if (shape === 'condensed') { k[0] = 0.15; k[7] = 0.3; k[6] = 0.5; }
  else if (shape === 'strong') { k[0] = 0.3; k[2] = 0.5; } else if (shape === 'weak') { k[7] = 0.4; k[6] = 0.5; k[5] = 0.6; k[4] = 0.7; } else if (shape === 'random') for (let r = 0; r < 8; r++) k[r] = 0.05 + 0.95 * rnd();
  return k;
}
const out = new URL(`./out/sweep-${seed}.jsonl`, import.meta.url); writeFileSync(out, '', { flag: 'a' }); const pool = PRESETS.filter((p) => p.action !== 'Limped'); const deck = 'AKQJT98765432', suits = 'shdc';
for (let done = 0; done < +count;) {
  const p = pick(pool); const b = []; while (b.length < 5) { const c = pick([...deck]) + pick([...suits]); if (!b.includes(c)) b.push(c); }
  const stack = pick([40, 75, 125, 250, 500]); const tree = { betSizes: [[0.75]], raiseSizes: [{ times: 3 }], maxRaises: 2 };
  let base; try { base = fs.defineSpot({ board: b.join(''), pot: 100, stack, oop: p.ranges.oop, ip: p.ranges.ip, ...tree }); } catch { continue; }
  const board = Array.from(base.board); const F = rowsOf(board); const shapes = [pick(SHAPES), pick(SHAPES)]; const text = []; const start = [];
  for (const s of [0, 1]) { const k = sculpt(shapes[s]); const pl = base.players[s]; const w = new Float64Array(N); const parts = [];
    Array.from(pl.combos).forEach((c, i) => { const x = (pl.weights.length === N ? pl.weights[c] : pl.weights[i]) * k[F.lv[c]]; if (x > 0.005 && F.lv[c] >= 0) { w[c] = x; parts.push(`${fs.formatCard ? fs.formatCard(CA(c)) + fs.formatCard(CB(c)) : NAME(CA(c)) + NAME(CB(c))}:${x.toFixed(3)}`); } });
    start.push(w); text.push(parts.join(',')); }
  if (text[0].length < 40 || text[1].length < 40) continue;
  let spot; try { spot = fs.defineSpot({ board: b.join(''), pot: 100, stack, oop: text[0], ip: text[1], ...tree }); } catch { continue; }
  const run = fs.createRun(spot, { isomorphism: false }); let ex = 9; while (ex > 0.3 && run.completed < 3000) { run.step(20); ex = run.exploitabilityPercent(); }
  const sol = run.snapshot(); const nodes = treeOf(fs, spot); const seatOf = (n) => (n.seat === 'ip' || n.seat === 1 ? 1 : 0); done++;
  const share = (w) => { const t = new Float64Array(8); let all = 0; for (let c = 0; c < N; c++) if (w[c] > 0) { t[F.lv[c]] += w[c]; all += w[c]; } return Array.from(t, (x) => +(x / all).toFixed(4)); };
  const row = { board: b.join(''), matchup: `${p.action}-${p.oop}-${p.ip}`, stack, shapes, exploit: +ex.toFixed(3), rows: [share(start[0]), share(start[1])], at: {} };
  const look = (id, mine, his, key) => {        // one decision: the range that gets there by equity band and by row, and what each part does
    const n = nodes[id]; const view = sol.strategyAt(id, 0); const k = view.actions.length; const at = new Int32Array(N).fill(-1); Array.from(view.combos).forEach((c, i) => { at[c] = i; }); const kinds = n.edges.map((x) => x.kind);
    const e = equity(F, mine, his); const he = equity(F, his, mine); const quiet = kinds.indexOf('fold') >= 0 ? kinds.indexOf('fold') : kinds.indexOf('check'); const call = kinds.indexOf('call'); const loud = kinds.findIndex((x) => x === 'bet' || x === 'raise' || x === 'allin');
    const bands = Array.from({ length: 10 }, () => [0, 0, 0, 0]); const byRow = Array.from({ length: 8 }, () => [0, 0, 0, 0]); let all = 0, eq = 0, strong = 0, weak = 0, ht = 0, hStrong = 0, hWeak = 0;
    for (let c = 0; c < N; c++) { const w = mine[c]; if (!(w > 0) || at[c] < 0) continue; const pr = (a) => (a >= 0 ? view.probs[at[c] * k + a] : 0); const add = (cell) => { cell[0] += w; cell[1] += w * pr(quiet); cell[2] += w * pr(call); cell[3] += w * pr(loud); };
      add(bands[Math.min(9, Math.floor(e[c] * 10))]); add(byRow[F.lv[c]]); all += w; eq += w * e[c]; if (e[c] >= 0.8) strong += w; if (e[c] < 0.3) weak += w; }
    for (let c = 0; c < N; c++) if (his[c] > 0) { ht += his[c]; if (he[c] >= 0.8) hStrong += his[c]; if (he[c] < 0.3) hWeak += his[c]; }
    const toCall = n.invested[1 - seatOf(n)] - n.invested[seatOf(n)]; const r4 = (x) => +x.toFixed(4); const cells = (xs) => xs.map(([w, q, c_, l]) => (w > 0 ? [r4(w / all), r4(q / w), r4(c_ / w), r4(l / w)] : [0, 0, 0, 0]));
    row.at[key] = { reach: r4(all), size: toCall > 0 ? r4(toCall / (n.pot - toCall)) : 0.75, canRaise: kinds.includes('raise') || (toCall > 0 && kinds.includes('allin')), equity: r4(eq / all), strong: r4(strong / all), weak: r4(weak / all), hisStrong: r4(hStrong / ht), hisWeak: r4(hWeak / ht), bands: cells(bands), rows: cells(byRow) };
    return { view, at, k, kinds };
  };
  const after = (w, d, a) => { const o = new Float64Array(N); for (let c = 0; c < N; c++) if (w[c] > 0 && d.at[c] >= 0) o[c] = w[c] * d.view.probs[d.at[c] * d.k + a]; return o; };
  const child = (id, kind) => { const n = nodes[id]; const i = n.edges.findIndex((x) => x.kind === kind || (kind === 'bet' && x.kind === 'allin')); return i < 0 ? [-1, -1] : [n.edges[i].child, i]; };
  const d0 = look(0, start[0], start[1], 'oop first'); const [nx, ix] = child(0, 'check'); const [nb, ib] = child(0, 'bet');
  if (nx >= 0 && nodes[nx].kind === 'decision') { const oopX = after(start[0], d0, ix); const d1 = look(nx, start[1], oopX, 'ip checked to'); const [nxb, ixb] = child(nx, 'bet'); if (nxb >= 0 && nodes[nxb].kind === 'decision') look(nxb, oopX, after(start[1], d1, ixb), 'oop facing a bet'); }
  if (nb >= 0 && nodes[nb].kind === 'decision') look(nb, start[1], after(start[0], d0, ib), 'ip facing a bet');
  appendFileSync(out, JSON.stringify(row) + '\n'); if (done % 50 === 0) console.error(`${done}/${count}`);
}
