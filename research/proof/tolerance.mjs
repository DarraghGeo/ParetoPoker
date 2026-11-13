// How far is each quoted quantity, at a page accuracy, from the two references? Largest differences by
// street, by how much of the thinner range takes the line, and by how often the range takes the action.
//   node tolerance.mjs <file filter> [json]
import { readFileSync, readdirSync } from 'node:fs';
const dir = new URL('./out/', import.meta.url); const want = process.argv[2] ?? ''; const asJson = process.argv[3] === 'json';
const files = readdirSync(dir).filter((f) => f.startsWith('measure-') && f.endsWith('.jsonl') && f.includes(want) && !f.includes('held'));
export const ON = 0.05;
const LINE = [['line 50%+', 0.5], ['line 20-50%', 0.2], ['line 5-20%', 0.05]];
const stats = new Map(); const add = (key, x) => { if (x == null || Number.isNaN(x)) return; let s = stats.get(key); if (!s) stats.set(key, s = []); s.push(x); };
for (const file of files) {
  let head = null;
  for (const text of readFileSync(new URL(file, dir), 'utf8').split('\n')) {
    if (!text) continue; const r = JSON.parse(text); if (r.head) { head = r.head; continue; }
    const n = r.a.length; const R = n - 2;
    const pairs = []; for (let i = 0; i < R; i++) { pairs.push([`level ${i}`, i, R]); pairs.push([`level ${i}`, i, R + 1]); } pairs.push(['ref v ref', R, R + 1]);
    for (const [name, i, j] of pairs) {
      const lr = Math.min(...head.line[i]); const line = LINE.find(([, lo]) => lr >= lo)?.[0]; if (!line) continue;
      const on = head.actions.map((_, a) => head.freq[i][a] >= ON); const live = head.actions.map((_, a) => a).filter((a) => on[a]);
      const k = (q, often = '') => `${q}|${name}|round ${head.round} ${line}${often}`;
      const fb = (...as) => (Math.min(...as.map((a) => head.freq[i][a])) >= 0.2 ? ' often' : ' seldom');
      const A = r.a[i]; const B = r.a[j];
      add(k('equity (points)'), 100 * Math.abs(r.eq[i] - r.eq[j]));
      for (let x = 0; x < live.length; x++) for (let y = x + 1; y < live.length; y++) { const a = live[x], b = live[y]; add(k('gap between two actions (% pot)', fb(a, b)), Math.abs((A[a].w - A[b].w) - (B[a].w - B[b].w))); }
      const passive = head.kinds.findIndex((kind, a) => on[a] && (kind === 'check' || kind === 'call'));
      for (const a of live) {
        if (A[a].f != null && B[a].f != null && head.kinds[a] !== 'check' && head.kinds[a] !== 'call' && head.kinds[a] !== 'fold') {
          add(k('he folds (points)', fb(a)), 100 * Math.abs(A[a].f - B[a].f));
          if (A[a].cs >= 0.05 && B[a].c != null) { add(k('worth when he continues (% pot)', fb(a)), Math.abs(A[a].c - B[a].c)); if (passive >= 0) add(k('worth when he continues, less the passive action (% pot)', fb(a, passive)), Math.abs((A[a].c - A[passive].w) - (B[a].c - B[passive].w))); }
        }
        if (A[a].k && B[a].k && A[a].k[0] > 0 && head.ends[a]) {
          add(k('next card: part on lifting cards (% pot)', fb(a)), Math.abs(A[a].k[2] - B[a].k[2])); add(k('next card: part on the other cards (% pot)', fb(a)), Math.abs(A[a].k[3] - B[a].k[3]));
          const fold = head.kinds.findIndex((kind) => kind === 'fold');
          if (fold >= 0) { const gain = (S, t) => (t ? S[a].k[2] - S[fold].w * S[a].k[1] : S[a].k[3] - S[fold].w * (1 - S[a].k[1])); add(k('next card: gain over folding on lifting cards (% pot)', fb(a)), Math.abs(gain(A, 1) - gain(B, 1))); add(k('next card: gain over folding on the other cards (% pot)', fb(a)), Math.abs(gain(A, 0) - gain(B, 0))); }
        }
      }
      r.a[i].forEach((x, a) => add(k('strategy (points)'), 100 * Math.abs(x.s - B[a].s)));
    }
  }
}
const rows = [...stats.entries()].map(([key, xs]) => { xs.sort((a, b) => a - b); const q = (p) => xs[Math.min(xs.length - 1, Math.floor(p * xs.length))]; const [what, pair, bucket] = key.split('|'); return { what, pair, bucket, n: xs.length, median: +q(0.5).toFixed(3), p99: +q(0.99).toFixed(3), p999: +q(0.999).toFixed(3), max: +xs[xs.length - 1].toFixed(3) }; });
rows.sort((a, b) => a.what.localeCompare(b.what) || a.bucket.localeCompare(b.bucket) || a.pair.localeCompare(b.pair));
if (asJson) console.log(JSON.stringify(rows));
else { let last = ''; for (const r of rows) { if (r.what !== last) { console.log(`\n${r.what}`); last = r.what; } console.log(`  ${r.bucket.padEnd(30)} ${r.pair.padEnd(10)} n=${String(r.n).padStart(7)}  median ${String(r.median).padStart(7)}  p99 ${String(r.p99).padStart(7)}  p99.9 ${String(r.p999).padStart(7)}  max ${String(r.max).padStart(8)}`); }
  console.log(`\nfiles: ${files.join(', ')}`); }
