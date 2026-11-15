// Testing the "what would change it" sentences. The explanation says what the range would do if he could not raise, or
// could not bet when checked to, by counting one move ahead with that taken away. Here the game is actually changed that
// way and solved again, and the solver's new bet frequency is set beside what the sentence claimed.
//   node why-check.mjs [spots] [seed]    -> out/why-check.jsonl
import { writeFileSync, appendFileSync } from 'node:fs';
import * as fs from 'poker-flopsolve';
import { treeOf } from '../../src/solver/flopsolve.js';
import { PRESETS } from '../../web/presets.js';
import { study, explainRange } from '../../src/explain/street.js';
const [count = '12', seed = '71'] = process.argv.slice(2);
let a = (+seed * 2654435761) >>> 0; const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; const rand = (k) => Math.floor(rnd() * k);
const pool = PRESETS.filter((p) => p.action !== 'Limped' && (!process.env.ONLY || process.env.ONLY.split(',').includes(p.action)));
const SIZES = [[0.33, 1], [0.5, 1], [0.5, 1]]; const base = { betSizes: SIZES, raiseSizes: [{ times: 3 }], maxRaises: 2, allInThreshold: 0.67 };
const out = new URL('./out/why-check.jsonl', import.meta.url); writeFileSync(out, ''); let done = 0;
const solve = (config) => { const spot = fs.defineSpot(config); const run = fs.createRun(spot, { workers: +(process.env.WORKERS ?? 4) }); let e = 9; while (e > 0.15 && run.completed < 1500) { run.step(10); e = run.exploitabilityPercent(); } return { spot, solution: run.snapshot(), nodes: treeOf(fs, spot) }; };
const betShare = (g, id) => { const st = study(fs, g.solution, g.nodes, id, []); return st ? st.actions.reduce((t, x) => t + (['bet', 'allin'].includes(x.kind) ? x.freq : 0), 0) : null; };
while (done < +count) {
  const p = pool[rand(pool.length)]; const deck = 'AKQJT98765432', suits = 'shdc'; const b = []; while (b.length < 3) { const c = deck[rand(13)] + suits[rand(4)]; if (!b.includes(c)) b.push(c); } const board = b.join('');
  const cfg = { board, pot: p.pot, stack: p.stack, oop: p.ranges.oop, ip: p.ranges.ip, ...base }; let g; try { const probe = fs.defineSpot(cfg); if (probe.estimate.bytes > +(process.env.MAXMB ?? 500) * 2 ** 20) continue; g = solve(cfg); } catch { continue; }
  const t0 = Date.now(); const check = g.nodes[0].edges.find((x) => x.kind === 'check').child; const row = { spot: `${p.action}-${p.oop}-${p.ip}`, action: p.action, board, spr: +(p.stack / p.pot).toFixed(1) };
  for (const [who, id] of [['oop', 0], ['ip', check]]) {
    const st = study(fs, g.solution, g.nodes, id, []); const said = explainRange(st); if (!said) continue; row[who] = { ...said.facts, line: said.line, change: said.reasons.find((r) => r.id === 'change')?.text ?? null };
    // the game with that one thing taken away from the other player on the flop, solved again
    const other = who === 'oop' ? 'ip' : 'oop';
    if (said.facts.noRaise != null) { try { const g2 = solve({ ...cfg, maxRaises: { [who]: [2, 2, 2], [other]: [1, 2, 2] } }); const id2 = who === 'oop' ? 0 : g2.nodes[0].edges.find((x) => x.kind === 'check').child; row[who].solvedNoRaise = betShare(g2, id2); } catch (e) { row[who].err = String(e.message).slice(0, 80); } }
    if (said.facts.noStab != null && who === 'oop') { try { const g3 = solve({ ...cfg, betSizes: { oop: SIZES, ip: [[], SIZES[1], SIZES[2]] } }); row[who].solvedNoStab = betShare(g3, 0); } catch (e) { row[who].err2 = String(e.message).slice(0, 80); } }
  }
  row.seconds = Math.round((Date.now() - t0) / 1000); appendFileSync(out, JSON.stringify(row) + '\n'); done++;
  const f = (x) => (x == null ? ' n/a' : x.toFixed(2));
  console.error(`${row.spot} ${board}: OOP bets ${f(row.oop?.bet)} (rule ${f(row.oop?.ruleBet)}); no raise: rule ${f(row.oop?.noRaise)}, solved ${f(row.oop?.solvedNoRaise)}; no stab: rule ${f(row.oop?.noStab)}, solved ${f(row.oop?.solvedNoStab)} | IP bets ${f(row.ip?.bet)} (rule ${f(row.ip?.ruleBet)}); no raise: rule ${f(row.ip?.noRaise)}, solved ${f(row.ip?.solvedNoRaise)} ${row.oop?.err ?? ''} ${row.oop?.err2 ?? ''} | ${row.seconds}s`);
}
