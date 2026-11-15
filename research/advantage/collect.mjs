// Range advantage without solving: for every preset matchup and a sample of flops, each range's equity against the other,
// and how much of each range is strong (75%+ equity). -> out/flops.jsonl
import { writeFileSync, appendFileSync } from 'node:fs';
import * as fs from 'poker-flopsolve';
import { equityVs } from '../../src/solver/flopsolve.js';
import { PRESETS } from '../../web/lib/study/presets.js';
const [per = '60', seed = '11'] = process.argv.slice(2); const N = fs.COMBOS;
let a = (+seed * 2654435761) >>> 0; const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; const rand = (k) => Math.floor(rnd() * k);
const file = new URL(`./out/flops-${seed}.jsonl`, import.meta.url); writeFileSync(file, ''); const deck = 'AKQJT98765432', suits = 'shdc'; const pool = PRESETS.filter((p) => p.action !== 'Limped');
const flops = []; while (flops.length < +per) { const b = []; while (b.length < 3) { const c = deck[rand(13)] + suits[rand(4)]; if (!b.includes(c)) b.push(c); } flops.push(b.join('')); }
const full = (pl) => { const w = new Float64Array(N); Array.from(pl.combos).forEach((c, i) => { w[c] = pl.weights.length === N ? pl.weights[c] : pl.weights[i]; }); return w; };
const stats = (e, w) => { let m = 0, t = 0, s = 0; for (let c = 0; c < N; c++) if (w[c] > 0 && !Number.isNaN(e[c])) { m += w[c]; t += w[c] * e[c]; if (e[c] >= 0.75) s += w[c]; } return [t / m, s / m]; };
let n = 0; for (const p of pool) { for (const board of flops) { let spot; try { spot = fs.defineSpot({ board, pot: p.pot, stack: p.stack, oop: p.ranges.oop, ip: p.ranges.ip, betSizes: [[0.75]] }); } catch { continue; }
    const w0 = full(spot.players[0]), w1 = full(spot.players[1]); const bd = Array.from(spot.board); const [e0, s0] = stats(equityVs(fs, bd, w0, w1), w0); const [e1, s1] = stats(equityVs(fs, bd, w1, w0), w1);
    appendFileSync(file, JSON.stringify({ pre: `${p.action}-${p.oop}-${p.ip}`, action: p.action, board, eq: +e0.toFixed(4), strong: [+s0.toFixed(4), +s1.toFixed(4)] }) + '\n'); n++; }
  console.error(p.action, p.oop, p.ip, n); }
// what each range holds, rank by rank: the share of its hands that contain the rank, and pocket pairs of it
const hold = pool.map((p) => { const spot = fs.defineSpot({ board: '2c7d9h', pot: p.pot, stack: p.stack, oop: p.ranges.oop, ip: p.ranges.ip, betSizes: [[0.75]] }); return { pre: `${p.action}-${p.oop}-${p.ip}`, ranges: [p.ranges.oop, p.ranges.ip] }; });
writeFileSync(new URL('./out/ranges.json', import.meta.url), JSON.stringify(hold));
