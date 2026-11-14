// The first collection did not keep his range at each decision. It can be put back exactly from what was kept: his
// range at a decision is his hands at the decision before, times how often each took the action that leads here.
//   node rebuild.mjs  -> out/full-<seed>.jsonl for seeds 1-6, each record with `vr` as the later collection has it
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fs } from '../proof/lib.mjs';
import { equityVs } from '../../src/solver/flopsolve.js';
const N = fs.COMBOS; const id = new Map(); for (let c = 0; c < N; c++) { const t = fs.formatCombo(c); id.set(t, c); id.set(t.slice(2) + t.slice(0, 2), c); }
const r4 = (x) => +x.toFixed(4);
/** Where his range at this line comes from: the line that holds his hands, and which of its actions leads here (null: all of them). */
function source(line, actionsOf) {
  const [head, tail] = line.includes('|') ? line.split('|') : [null, line];
  const pre = head == null ? '' : `${head}|`; let m;
  if (tail === 'first') return [`${pre}x`, null];
  if (tail === 'x') return [`${pre}first`, 'check'];
  if ((m = /^(x?)b(\d+)r(\d+)$/.exec(tail))) return [`${pre}${m[1]}b${m[2]}`, +m[3]];
  if ((m = /^b(\d+)$/.exec(tail))) return [`${pre}first`, +m[1]];
  if ((m = /^xb(\d+)$/.exec(tail))) return [`${pre}x`, +m[1]];
  return null;
}
for (const seed of [1, 2, 3, 4, 5, 6]) {
  const file = new URL(`./out/hands-${seed}.jsonl`, import.meta.url); if (!existsSync(file)) continue;
  const rows = readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)); const by = new Map(); for (const r of rows) by.set(`${r.spot}|${r.board}|${r.line}`, r);
  const out = []; let missed = 0;
  for (const r of rows) {
    const src = source(r.line); const from = src && by.get(`${r.spot}|${r.board}|${src[0]}`); if (!from) { missed++; continue; }
    const a = src[1] === 'check' ? from.actions.findIndex((x) => x.kind === 'check') : src[1];
    const his = new Float64Array(N); for (const h of from.hands) his[id.get(h.h)] = h.w * (a == null ? 1 : h.p[a]);
    const mine = new Float64Array(N); for (const h of r.hands) mine[id.get(h.h)] = h.w;
    const board = fs.parseCards(r.board.replace(/ /g, '')); const e = equityVs(fs, board, his, mine); const vr = [];
    for (let c = 0; c < N; c++) if (his[c] > 0.002 && !Number.isNaN(e[c])) vr.push([fs.formatCombo(c), r4(his[c]), r4(e[c])]);
    out.push(JSON.stringify({ ...r, vr }));
  }
  writeFileSync(new URL(`./out/full-${seed}.jsonl`, import.meta.url), out.join('\n') + '\n'); console.log(`seed ${seed}: ${out.length} decisions, ${missed} without a source`);
}
