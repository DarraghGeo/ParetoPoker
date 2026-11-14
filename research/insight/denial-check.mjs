// The denial rule against the solver's bet frequency, decision by decision, on the collected flops and turns.
import { readFileSync, existsSync } from 'node:fs';
import { fs } from '../proof/lib.mjs';
import { denial } from './formulas.mjs';
const N = fs.COMBOS; const id = new Map(); for (let c = 0; c < N; c++) { const t = fs.formatCombo(c); id.set(t, c); id.set(t.slice(2) + t.slice(0, 2), c); }
const ids = Array.from({ length: N }, (_, c) => c); const rows = []; let k = 0;
for (const name of [1, 2, 3, 4, 5, 6].map((s) => `full-${s}`).concat([7, 8, 9].map((s) => `hands-${s}`))) {
  const file = new URL(`./out/${name}.jsonl`, import.meta.url); if (!existsSync(file)) continue;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line || !line.replace(/ /g, '').includes('"toCall":0')) continue; const d = JSON.parse(line); const board = fs.parseCards(d.board.replace(/ /g, ''));
    if (board.length > 4 || d.toCall > 0 || !d.vr || /b\d+r\d+/.test(d.line)) continue; if (board.length === 4 && (k++ % 4)) continue;   // every flop, a quarter of the turns
    const bets = d.actions.map((a, i) => (a.kind === 'bet' || a.kind === 'allin' ? i : -1)).filter((i) => i >= 0); if (!bets.length) continue;
    const mine = new Float64Array(N); const his = new Float64Array(N); for (const h of d.hands) mine[id.get(h.h)] = h.w; for (const v of d.vr) his[id.get(v[0])] = v[1];
    const s = Math.min(...bets.map((i) => d.actions[i].add / d.pot)); const t = denial(board, mine, his, ids, s); if (!t) continue;
    rows.push({ street: board.length, first: d.line.split('|').pop() === 'first', y: bets.reduce((u, i) => u + d.actions[i].freq, 0), d: t.share, seed: +name.split('-')[1] });
  }
}
const mean = (v) => v.reduce((t, x) => t + x, 0) / v.length; const corr = (a, b) => { const ma = mean(a), mb = mean(b); let n = 0, da = 0, db = 0; for (let i = 0; i < a.length; i++) { n += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; } return n / Math.sqrt(da * db); };
for (const st of [3, 4]) for (const first of [true, false]) for (const [tag, pick] of [['all', () => true], ['unseen flops', (r) => r.seed >= 9]]) {
  const x = rows.filter((r) => r.street === st && r.first === first && pick(r)); if (x.length < 12) continue; const e = x.map((r) => Math.abs(r.d - r.y));
  console.log(`${st === 3 ? 'Flop' : 'Turn'}, ${first ? 'out of position' : 'in position'}, ${tag}: ${x.length} decisions. Solver bets ${mean(x.map((r) => r.y)).toFixed(3)}, denial ${mean(x.map((r) => r.d)).toFixed(3)}, misses by ${mean(e).toFixed(3)}, tracks ${corr(x.map((r) => r.d), x.map((r) => r.y)).toFixed(2)}; within 10 points ${(100 * e.filter((v) => v < 0.1).length / e.length).toFixed(0)}%`);
}
