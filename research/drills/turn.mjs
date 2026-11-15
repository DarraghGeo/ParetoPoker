// For the "did the card move it?" drill: range-versus-range equity on a flop and on a few turn cards, starting ranges.
import { writeFileSync } from 'node:fs';
import * as fs from 'poker-flopsolve';
import { equityVs } from '../../src/solver/flopsolve.js';
import { PRESETS } from '../../web/lib/study/presets.js';
const N = fs.COMBOS; const p = PRESETS.find((x) => x.action === 'SRP' && x.oop === 'BB' && x.ip === 'BU'); const FLOP = '9s7s3d'; const TURNS = ['Ah', '6c', '2s', 'Kd'];
const spot = fs.defineSpot({ board: FLOP, pot: p.pot, stack: p.stack, oop: p.ranges.oop, ip: p.ranges.ip, betSizes: [[0.75]] });
const full = (pl) => { const w = new Float64Array(N); Array.from(pl.combos).forEach((c, i) => { w[c] = pl.weights.length === N ? pl.weights[c] : pl.weights[i]; }); return w; }; const w0 = full(spot.players[0]), w1 = full(spot.players[1]);
const eq = (board) => { const dead = new Set(board); const a = Float64Array.from(w0), b = Float64Array.from(w1); for (let c = 0; c < N; c++) if (dead.has(fs.COMBO_CARDS[2 * c]) || dead.has(fs.COMBO_CARDS[2 * c + 1])) { a[c] = 0; b[c] = 0; } const e = equityVs(fs, board, a, b); let m = 0, t = 0; for (let c = 0; c < N; c++) if (a[c] > 0 && !Number.isNaN(e[c])) { m += a[c]; t += a[c] * e[c]; } return +(t / m).toFixed(4); };
const flop = Array.from(spot.board); const out = { pre: 'SRP', names: ['BB', 'BU'], flop: FLOP.match(/../g).join(' '), eq: eq(flop), turns: TURNS.map((t) => ({ card: t, eq: eq([...flop, fs.parseCards(t)[0]]) })) };
writeFileSync(new URL('./turn.json', import.meta.url), JSON.stringify(out)); console.log(JSON.stringify(out));
