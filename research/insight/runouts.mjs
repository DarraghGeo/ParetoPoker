// Multi-street equities without solving: for every turn betting decision, each hand's share of his range beaten on
// every river card (and his hands' against ours). -> out/runouts.bin (float32) and out/runouts.json (the index)
import { readFileSync, writeFileSync, existsSync, openSync, writeSync, closeSync } from 'node:fs';
import { fs } from '../proof/lib.mjs';
import { equityVs } from '../../src/solver/flopsolve.js';
const N = fs.COMBOS; const id = new Map(); for (let c = 0; c < N; c++) { const t = fs.formatCombo(c); id.set(t, c); id.set(t.slice(2) + t.slice(0, 2), c); }
const files = [1, 2, 3, 4, 5, 6].map((s) => `full-${s}`).concat([7, 8, 9].map((s) => `hands-${s}`)); const index = []; const out = openSync(new URL('./out/runouts.bin', import.meta.url), 'w'); let at = 0;
for (const name of files) {
  const file = new URL(`./out/${name}.jsonl`, import.meta.url); if (!existsSync(file)) continue;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line) continue; const d = JSON.parse(line); const board = fs.parseCards(d.board.replace(/ /g, ''));
    if (board.length !== 4 || d.toCall > 0 || !d.vr || !d.hands.length || d.hands[0].now == null) continue;
    const mine = new Float64Array(N); const his = new Float64Array(N); const H = d.hands.map((h) => id.get(h.h)); const V = d.vr.map((v) => id.get(v[0])); d.hands.forEach((h, i) => { mine[H[i]] = h.w; }); d.vr.forEach((v, i) => { his[V[i]] = v[1]; });
    const rivers = []; for (let c = 0; c < 52; c++) if (!board.includes(c)) rivers.push(c);
    const buf = new Float32Array((H.length + V.length) * rivers.length);
    rivers.forEach((r, k) => {
      const m = Float64Array.from(mine); const v = Float64Array.from(his); for (let c = 0; c < N; c++) if (fs.COMBO_CARDS[2 * c] === r || fs.COMBO_CARDS[2 * c + 1] === r) { m[c] = 0; v[c] = 0; }
      const e1 = equityVs(fs, [...board, r], m, v); const e2 = equityVs(fs, [...board, r], v, m);
      H.forEach((c, i) => { buf[i * rivers.length + k] = m[c] > 0 ? e1[c] : NaN; }); V.forEach((c, i) => { buf[(H.length + i) * rivers.length + k] = v[c] > 0 ? e2[c] : NaN; });
    });
    writeSync(out, Buffer.from(buf.buffer)); index.push({ key: `${d.spot}|${d.board}|${d.line}`, at, nh: H.length, nv: V.length, nr: rivers.length }); at += buf.length;
  }
  console.error(name, index.length);
}
closeSync(out); writeFileSync(new URL('./out/runouts.json', import.meta.url), JSON.stringify(index));
