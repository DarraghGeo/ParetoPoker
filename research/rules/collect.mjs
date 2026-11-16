// What each action is worth, for each kind of hand, at every decision. Flop spots give the flop decisions; turn spots give
// the turn decisions and the rivers (a sample of river cards). Hands are grouped in cells by ladder level (0 trash .. 7 a set
// or better), equity against his range in twenty steps, and what is still to come (0 little, 1 a gutshot or overcards, 2 a
// draw). Per cell: its share of the range, how often the solution takes each action, and what always taking each action
// gives up there (the action's value against the best action's, the solution played after), in pots at that decision.
//   node collect.mjs flop|turn [spots] [seed]   -> out/cells-<kind>-<seed>.jsonl
import { writeFileSync, appendFileSync } from 'node:fs';
import * as fs from 'poker-flopsolve';
import { treeOf, equityVs } from '../../src/solver/flopsolve.js';
import { PRESETS } from '../../web/lib/study/presets.js';
import { study } from '../../src/explain/street.js';
import { evaluator } from '../../src/explain/best.js';
import { facts } from './facts.mjs';
const N = fs.COMBOS; const seatOf = (n) => (n.seat === 'ip' || n.seat === 1 ? 1 : 0); const r4 = (x) => +x.toFixed(4);
const [kind = 'flop', count = '10', seed = '81'] = process.argv.slice(2); const cards = kind === 'flop' ? 3 : 4;
const TREE = kind === 'flop' ? { betSizes: [[0.33, 0.75, 1.25], [0.75], [0.75]], raiseSizes: [{ times: 3 }], maxRaises: [2, 1, 1], allInThreshold: 0.67 } : { betSizes: [[0.33, 0.75, 1.5], [0.33, 0.75, 1.5]], raiseSizes: [{ times: 3 }], maxRaises: 2 };
let a0 = (+seed * 2654435761) >>> 0; const rnd = () => { a0 = (a0 + 0x6d2b79f5) >>> 0; let t = a0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; const rand = (k) => Math.floor(rnd() * k);
const pool = PRESETS.filter((p) => p.action !== 'Limped'); const out = new URL(`./out/cells-${kind}-${seed}.jsonl`, import.meta.url); writeFileSync(out, '');
for (let done = 0; done < +count;) {
  const p = pool[rand(pool.length)]; const deck = 'AKQJT98765432', suits = 'shdc'; const b = []; while (b.length < cards) { const c = deck[rand(13)] + suits[rand(4)]; if (!b.includes(c)) b.push(c); }
  const mult = kind === 'turn' ? [0.5, 1, 1, 1.5][rand(4)] : 1; const stack = +(p.stack * mult).toFixed(1);
  let spot; try { spot = fs.defineSpot({ board: b.join(''), pot: p.pot, stack, oop: p.ranges.oop, ip: p.ranges.ip, ...TREE }); } catch { continue; }
  if (spot.estimate.bytes > +(process.env.MAXMB ?? (kind === 'flop' ? 2500 : 700)) * 2 ** 20) continue;
  const t0 = Date.now(); const run = fs.createRun(spot, { workers: +(process.env.WORKERS ?? 2) }); let ex = 9; while (ex > (kind === 'flop' ? 0.35 : 0.25) && run.completed < (kind === 'flop' ? 500 : 1500)) { run.step(10); ex = run.exploitabilityPercent(); }
  const solved = run.snapshot(); const nodes = treeOf(fs, spot); const board = Array.from(spot.board); const valuer = evaluator(fs, solved, nodes); done++; let rows = 0;
  const kindOf = (n) => { const acts = []; let at = n; while (at.parent >= 0 && nodes[at.parent].kind !== 'chance') { const par = nodes[at.parent]; acts.unshift(par.edges[at.via].kind); at = par; } const last = acts[acts.length - 1]; return !acts.length ? 'first' : last === 'check' ? 'checkedTo' : acts.filter((x) => x !== 'check').length === 1 ? 'facingBet' : 'facingRaise'; };
  for (const n of nodes) {
    if (n.kind !== 'decision' || (kind === 'flop' && n.round > 0) || Date.now() - t0 > 240000) continue; const what = kindOf(n); const me = seatOf(n); if (n.round === 1 && what === 'facingRaise') continue;
    const deals = n.round === 0 ? [[]] : Array.from({ length: 52 }, (_, c) => c).filter((c) => !board.includes(c) && c % 6 === 0).map((c) => [c]);
    for (const dealt of deals) {
      let st; try { st = study(fs, solved, nodes, n.id, dealt); } catch { st = null; } if (!st || Math.min(...st.lineReach) < (n.round === 1 ? 0.06 : 0.02)) continue;
      const f = st.f; let vals; try { vals = valuer(f, 'average'); } catch { continue; } const eq = st.equity(); const hisEq = equityVs(fs, f.board, f.his, f.mine); const F = facts(Array.from(f.board)); const k = n.edges.length;
      // how much of the other range each hand beats as the board stands (ties half), in twenty steps: what the chart's bars show
      const nowOf = (mine, his) => { const hs = []; let all = 0; for (let v = 0; v < N; v++) if (his[v] > 1e-9 && F.lv[v] >= 0) { hs.push(v); all += his[v]; } hs.sort((x, y) => F.str[x] - F.str[y]); const out = new Float32Array(N); let i = 0, below = 0; const ms = []; for (let c = 0; c < N; c++) if (mine[c] > 1e-9 && F.lv[c] >= 0) ms.push(c); ms.sort((x, y) => F.str[x] - F.str[y]);
        let j = 0; for (const c of ms) { while (i < hs.length && F.str[hs[i]] < F.str[c]) below += his[hs[i++]]; let tie = 0; j = i; while (j < hs.length && F.str[hs[j]] === F.str[c]) tie += his[hs[j++]]; out[c] = (below + tie / 2) / all; } return out; };
      const now = nowOf(f.mine, f.his); const hisNow = nowOf(f.his, f.mine); const step = (x) => Math.max(0, Math.min(19, Math.floor(20 * x)));
      const cells = new Map(); let tot = 0;
      for (let c = 0; c < N; c++) { const w = f.mine[c]; if (!(w > 1e-9) || Number.isNaN(eq[c]) || F.lv[c] < 0) continue; let best = -Infinity; const v = []; for (let a = 0; a < k; a++) { const x = vals[a][c]; v.push(x); if (!Number.isNaN(x) && x > best) best = x; } if (!Number.isFinite(best)) continue;
        const key = F.lv[c] * 100 + step(eq[c]) + 10000 * (F.come[c] >= 8 ? 2 : F.come[c] >= 4 ? 1 : 0) + 100000 * step(now[c]); let cell = cells.get(key); if (!cell) cells.set(key, cell = new Float64Array(1 + 2 * k)); cell[0] += w; tot += w;
        for (let a = 0; a < k; a++) { cell[1 + a] += w * st.sigma(c, a); cell[1 + k + a] += w * (Number.isNaN(v[a]) ? 0 : best - v[a]); } }
      if (!(tot > 0)) continue; const hisLv = new Float64Array(8); const hisE = new Float64Array(20); const hisN = new Float64Array(20); let htot = 0; for (let v = 0; v < N; v++) { const w = f.his[v]; if (!(w > 1e-9) || Number.isNaN(hisEq[v]) || F.lv[v] < 0) continue; hisLv[F.lv[v]] += w; hisE[step(hisEq[v])] += w; hisN[step(hisNow[v])] += w; htot += w; }
      if (!(htot > 0)) continue; const toCall = st.toCall; const before = st.pot - toCall;
      appendFileSync(out, JSON.stringify({ spot: `${p.action}-${p.oop}-${p.ip} ${b.join('')}`, action: p.action, street: f.board.length, what, seat: me, reach: st.lineReach.map(r4), pot: r4(st.pot / nodes[0].pot), spr: r4((spot.stackUnits / spot.chipScale * (nodes[0].pot / p.pot) - n.invested[me]) / st.pot), faced: toCall > 0 ? r4(toCall / (st.pot - toCall)) : 0,
        acts: n.edges.map((e) => [e.kind, r4((nodes[e.child].invested[me] - n.invested[me]) / st.pot)]), hisLv: Array.from(hisLv, (x) => r4(x / htot)), hisE: Array.from(hisE, (x) => r4(x / htot)), hisN: Array.from(hisN, (x) => r4(x / htot)),
        cells: [...cells].map(([key, c]) => [Math.floor(key % 10000 / 100), key % 100, Math.floor(key % 100000 / 10000), Math.floor(key / 100000), r4(c[0] / tot), ...Array.from(c.subarray(1, 1 + k), (x) => r4(x / c[0])), ...Array.from(c.subarray(1 + k), (x) => r4(x / c[0] / st.pot))]) }) + '\n'); rows++;
    }
  }
  console.error(`${done}/${count} ${p.action} ${b.join('')} ex ${ex.toFixed(2)} ${rows} decisions ${Math.round((Date.now() - t0) / 1000)}s`);
}
