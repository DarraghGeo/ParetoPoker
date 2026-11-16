// What sets the bet size? Turn spots with the preset ranges and three sizes on offer on both streets (a third of the
// pot, three quarters, one and a half pots). At every decision to bet (first to act, or checked to) on the turn and on
// every river: how deep the stacks are, how the range splits between the sizes, and both ranges by equity in twenty steps
// (with, for the range to act, how much of each step takes each size).
//   node sizes.mjs [spots] [seed]   -> out/sizes.jsonl
import { writeFileSync, appendFileSync } from 'node:fs';
import * as fs from 'poker-flopsolve';
import { treeOf, equityVs } from '../../src/solver/flopsolve.js';
import { PRESETS } from '../../web/lib/study/presets.js';
import { study } from '../../src/explain/street.js';

const N = fs.COMBOS; const seatOf = (n) => (n.seat === 'ip' || n.seat === 1 ? 1 : 0); const B = 20; const r3 = (x) => +x.toFixed(3);
const [count = '30', seed = '51'] = process.argv.slice(2);
let a0 = (+seed * 2654435761) >>> 0; const rnd = () => { a0 = (a0 + 0x6d2b79f5) >>> 0; let t = a0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; const rand = (k) => Math.floor(rnd() * k);
const pool = PRESETS.filter((p) => p.action !== 'Limped'); const out = new URL('./out/sizes.jsonl', import.meta.url); writeFileSync(out, '', { flag: 'a' });
const SIZES = [0.33, 0.75, 1.5];
for (let done = 0; done < +count;) {
  const p = pool[rand(pool.length)]; const deck = 'AKQJT98765432', suits = 'shdc'; const b = []; while (b.length < 4) { const c = deck[rand(13)] + suits[rand(4)]; if (!b.includes(c)) b.push(c); }
  const mult = [0.4, 0.7, 1, 1.5][rand(4)]; const stack = +(p.stack * mult).toFixed(1);   // the same ranges at other depths, to tell depth from pot type
  let spot; try { spot = fs.defineSpot({ board: b.join(''), pot: p.pot, stack, oop: p.ranges.oop, ip: p.ranges.ip, betSizes: [SIZES, SIZES], raiseSizes: [{ times: 3 }], maxRaises: 2 }); } catch { continue; }
  if (spot.estimate.bytes > 700 * 2 ** 20) continue;
  const t0 = Date.now(); const run = fs.createRun(spot, { workers: 4 }); let ex = 9; while (ex > 0.2 && run.completed < 2000) { run.step(10); ex = run.exploitabilityPercent(); }
  const solved = run.snapshot(); const nodes = treeOf(fs, spot); const board = Array.from(spot.board); const scale = nodes[0].pot / p.pot; done++; let rows = 0;
  const pathKind = (n) => { const acts = []; let at = n; while (at.parent >= 0 && nodes[at.parent].kind !== 'chance') { const par = nodes[at.parent]; acts.unshift(par.edges[at.via].kind); at = par; } return !acts.length ? 'first' : acts.length === 1 && acts[0] === 'check' ? 'checkedTo' : null; };
  /** How the street before went, for a river decision: who bet last on the turn, if anyone. */
  const before = (n) => { let at = n; while (at.parent >= 0 && nodes[at.parent].kind !== 'chance') at = nodes[at.parent]; if (at.parent < 0) return 'start'; let k = nodes[at.parent]; const acts = []; while (k.parent >= 0) { const par = nodes[k.parent]; if (par.kind === 'decision') acts.unshift([seatOf(par), par.edges[k.via].kind]); k = par; } const last = [...acts].reverse().find(([, kind]) => kind === 'bet' || kind === 'raise' || kind === 'allin'); return last ? `bet${last[0]}` : 'checked'; };
  for (const n of nodes) {
    if (n.kind !== 'decision') continue; const what = pathKind(n); if (!what) continue; const me = seatOf(n); const kinds = n.edges.map((e) => e.kind); const bets = kinds.map((k, a) => (k === 'bet' || k === 'allin' ? a : -1)).filter((a) => a >= 0); if (bets.length < 2) continue;
    const deals = n.round === 0 ? [[]] : Array.from({ length: 52 }, (_, c) => c).filter((c) => !board.includes(c) && c % 3 === 0).map((c) => [c]);
    for (const dealt of deals) {
      let st; try { st = study(fs, solved, nodes, n.id, dealt); } catch { st = null; } if (!st || Math.min(...st.lineReach) < 0.03) continue;
      const f = st.f; const eq = st.equity(); const hisEq = equityVs(fs, f.board, f.his, f.mine); const mine = Array.from({ length: B }, () => [0, ...bets.map(() => 0)]); const his = Array(B).fill(0); let tot = 0, htot = 0;
      for (let c = 0; c < N; c++) { const w = f.mine[c]; if (w > 1e-9 && !Number.isNaN(eq[c])) { const k = Math.max(0, Math.min(B - 1, Math.floor(B * eq[c]))); mine[k][0] += w; bets.forEach((a, j) => { mine[k][1 + j] += w * st.sigma(c, a); }); tot += w; } const v = f.his[c]; if (v > 1e-9 && !Number.isNaN(hisEq[c])) { his[Math.max(0, Math.min(B - 1, Math.floor(B * hisEq[c])))] += v; htot += v; } }
      if (tot < 1 || htot < 1) continue;
      appendFileSync(out, JSON.stringify({ spot: `${p.action}-${p.oop}-${p.ip} ${b.join('')}`, action: p.action, street: f.board.length, what, seat: me, before: n.round === 0 ? 'start' : before(n), mult, spr: r3((stack * scale - n.invested[me]) / n.pot), pot: r3(n.pot / nodes[0].pot),
        sizes: bets.map((a) => (kinds[a] === 'allin' ? 'allin' : r3((nodes[n.edges[a].child].invested[me] - n.invested[me]) / n.pot))), amounts: bets.map((a) => r3((nodes[n.edges[a].child].invested[me] - n.invested[me]) / n.pot)),
        mine: mine.map((x) => x.map((y) => r3(y / tot))), his: his.map((x) => r3(x / htot)) }) + '\n'); rows++;
    }
  }
  console.error(`${done}/${count} ${p.action} ${b.join('')} ex ${ex.toFixed(2)} ${rows} decisions ${Math.round((Date.now() - t0) / 1000)}s`);
}
