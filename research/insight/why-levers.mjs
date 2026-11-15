// What really changes how much a range bets. For each spot the game is changed in one way and solved again:
//   noRaise    the other player may not raise on this street
//   noStab     the other player may not bet when checked to on this street (first to act only)
//   hisStrong  his strongest fifth of hands (by equity against our range) is taken out of his range
//   myStrong   our strongest fifth is taken out of ours
//   shallow    half the stack behind
//   deep       twice the stack behind
// and the range's bet frequency at the same decision is read again. No rule is involved: these are the solver's answers.
//   node why-levers.mjs [spots] [seed]      ROOT=turn for turn spots of the collection   -> out/why-levers[-turn].jsonl
import { writeFileSync, appendFileSync, readFileSync } from 'node:fs';
import * as fs from 'poker-flopsolve';
import { treeOf, equityVs } from '../../src/solver/flopsolve.js';
import { PRESETS } from '../../web/lib/study/presets.js';
import { study, explainRange } from '../../src/explain/street.js';
const [count = '12', seed = '71'] = process.argv.slice(2); const ROOT = process.env.ROOT ?? 'flop'; const N = fs.COMBOS;
let a = (+seed * 2654435761) >>> 0; const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; const rand = (k) => Math.floor(rnd() * k);
const pool = PRESETS.filter((p) => p.action !== 'Limped' && (!process.env.ONLY || process.env.ONLY.split(',').includes(p.action)));
const streets = ROOT === 'turn' ? 2 : 3; const SIZES = ROOT === 'turn' ? [[0.5, 1], [0.5, 1]] : [[0.33, 1], [0.5, 1], [0.5, 1]]; const base = { betSizes: SIZES, raiseSizes: [{ times: 3 }], maxRaises: 2, allInThreshold: 0.67 };
const out = new URL(`./out/why-levers${ROOT === 'turn' ? '-turn' : ''}.jsonl`, import.meta.url); writeFileSync(out, ''); let done = 0;
const target = ROOT === 'turn' ? 0.05 : 0.15;
const solve = (config) => { const spot = fs.defineSpot(config); const run = fs.createRun(spot, { workers: +(process.env.WORKERS ?? 4) }); let e = 9; while (e > target && run.completed < 2000) { run.step(10); e = run.exploitabilityPercent(); } return { spot, solution: run.snapshot(), nodes: treeOf(fs, spot) }; };
const wager = (k) => !['check', 'call', 'fold'].includes(k);
const read = (g) => { const check = g.nodes[0].edges.find((x) => x.kind === 'check')?.child; const of = (id) => { if (id == null || g.nodes[id].kind !== 'decision') return null; const st = study(fs, g.solution, g.nodes, id, []); return st ? st.actions.reduce((t, x) => t + (wager(x.kind) ? x.freq : 0), 0) : null; }; return { oop: of(0), ip: of(check) }; };
const text = (w) => { const parts = []; for (let c = 0; c < N; c++) if (w[c] > 0.005) parts.push(`${fs.formatCombo(c)}:${+w[c].toFixed(3)}`); return parts.join(','); };
const weightsOf = (spot, p) => { const w = new Float64Array(N); const pl = spot.players[p]; for (const c of Array.from(pl.combos)) w[c] = pl.weights.length === N ? pl.weights[c] : 0; return w; };
/** A range without its strongest fifth (by equity against the other range). */
const withoutTop = (board, mine, his) => { const e = equityVs(fs, board, mine, his); const ids = []; let all = 0; for (let c = 0; c < N; c++) if (mine[c] > 0 && !Number.isNaN(e[c])) { ids.push(c); all += mine[c]; } ids.sort((x, y) => e[y] - e[x]); const o = Float64Array.from(mine); let seen = 0; for (const c of ids) { if (seen >= 0.2 * all) break; seen += mine[c]; o[c] = 0; } return o; };
const turns = []; if (ROOT === 'turn') { const seenT = new Set(); for (const sd of ['9', '7', '8']) { let t; try { t = readFileSync(new URL(`./out/hands-${sd}.jsonl`, import.meta.url), 'utf8'); } catch { continue; } for (const l of t.split('\n')) { if (!l.includes('|first"')) continue; const d = JSON.parse(l); if (d.board.replace(/ /g, '').length !== 8 || !/^(xx|bc\d|xbc\d)\|first$/.test(d.line) || d.toCall > 0 || !d.vr || Math.min(...d.reach) < 0.25) continue; const key = `${d.spot}|${d.line.replace(/\d/, '')}`; if (seenT.has(key)) continue; seenT.add(key); turns.push(d); } } for (let i = turns.length - 1; i > 0; i--) { const j = rand(i + 1); [turns[i], turns[j]] = [turns[j], turns[i]]; } }
while (done < +count) {
  let cfg; let label;
  if (ROOT === 'turn') { const d = turns.shift(); if (!d) break; cfg = { board: d.board.replace(/ /g, ''), pot: d.pot, stack: Math.max(d.behind, 1), oop: d.hands.filter((h) => h.w > 0.01).map((h) => `${h.h}:${h.w}`).join(','), ip: d.vr.filter((v) => v[1] > 0.01).map((v) => `${v[0]}:${v[1]}`).join(','), ...base }; label = { spot: d.spot, action: d.action, line: d.line }; }
  else { const p = pool[rand(pool.length)]; const deck = 'AKQJT98765432', suits = 'shdc'; const b = []; while (b.length < 3) { const c = deck[rand(13)] + suits[rand(4)]; if (!b.includes(c)) b.push(c); } cfg = { board: b.join(''), pot: p.pot, stack: p.stack, oop: p.ranges.oop, ip: p.ranges.ip, ...base }; label = { spot: `${p.action}-${p.oop}-${p.ip}`, action: p.action }; }
  let g; try { const probe = fs.defineSpot(cfg); if (probe.estimate.bytes > +(process.env.MAXMB ?? 400) * 2 ** 20) continue; g = solve(cfg); } catch { continue; }
  const t0 = Date.now(); const board = Array.from(g.spot.board); const w = [weightsOf(g.spot, 0), weightsOf(g.spot, 1)]; const row = { ...label, board: cfg.board, spr: +(cfg.stack / cfg.pot).toFixed(2), base: read(g) };
  // facts of the spot as it is
  const eq = [equityVs(fs, board, w[0], w[1]), equityVs(fs, board, w[1], w[0])]; const strong = (p) => { let t = 0, all = 0; for (let c = 0; c < N; c++) if (w[p][c] > 0 && !Number.isNaN(eq[p][c])) { all += w[p][c]; if (eq[p][c] >= 0.65) t += w[p][c]; } return all > 0 ? t / all : 0; }; row.strong = { oop: strong(0), ip: strong(1) };
  // what the explanation reads off the solution at each of the two decisions
  { const check = g.nodes[0].edges.find((x) => x.kind === 'check')?.child; row.facts = {}; for (const [who, id] of [['oop', 0], ['ip', check]]) { try { const st = id != null && g.nodes[id].kind === 'decision' ? study(fs, g.solution, g.nodes, id, []) : null; row.facts[who] = st ? explainRange(st)?.facts ?? null : null; } catch { row.facts[who] = null; } } }
  const ones = (n) => Array.from({ length: n }, () => 2); const but = (n, i, v) => { const o = ones(n); o[i] = v; return o; };
  const tries = {
    noRaiseIp: { ...cfg, maxRaises: { oop: ones(streets), ip: but(streets, 0, 1) } }, noRaiseOop: { ...cfg, maxRaises: { oop: but(streets, 0, 1), ip: ones(streets) } },
    noStab: { ...cfg, betSizes: { oop: SIZES, ip: [[], ...SIZES.slice(1)] } },
    oopLessStrong: { ...cfg, oop: text(withoutTop(board, w[0], w[1])) }, ipLessStrong: { ...cfg, ip: text(withoutTop(board, w[1], w[0])) },
    shallow: { ...cfg, stack: cfg.stack / 2 }, deep: { ...cfg, stack: cfg.stack * 2 },
  };
  for (const [name, c2] of Object.entries(tries)) { try { row[name] = read(solve(c2)); } catch (e) { row[name] = { err: String(e.message).slice(0, 60) }; } }
  row.seconds = Math.round((Date.now() - t0) / 1000); appendFileSync(out, JSON.stringify(row) + '\n'); done++;
  const f = (x) => (x == null ? ' n/a' : x.toFixed(2));
  console.error(`${row.spot} ${row.board} ${row.line ?? ''}: OOP bets ${f(row.base.oop)} -> no raise ${f(row.noRaiseIp.oop)}, no stab ${f(row.noStab.oop)}, he less strong ${f(row.ipLessStrong.oop)}, we less strong ${f(row.oopLessStrong.oop)}, shallow ${f(row.shallow.oop)}, deep ${f(row.deep.oop)} | IP bets ${f(row.base.ip)} -> no raise ${f(row.noRaiseOop.ip)}, he less strong ${f(row.oopLessStrong.ip)}, we less strong ${f(row.ipLessStrong.ip)}, shallow ${f(row.shallow.ip)}, deep ${f(row.deep.ip)} | ${row.seconds}s`);
}
