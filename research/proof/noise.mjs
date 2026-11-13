// Reads the stability records and says, quantity by quantity, how far the page's solve can be from the
// references and how far the references are from each other. Largest and 99.9th percentile differences.
import { readFileSync, readdirSync } from 'node:fs';
const dir = new URL('./out/', import.meta.url); const want = process.argv[2] ?? '';
const files = readdirSync(dir).filter((f) => f.startsWith('stability-') && f.endsWith('.jsonl') && f.includes(want));
const BUCKETS = [['line 50%+', 0.5, 2], ['line 20-50%', 0.2, 0.5], ['line 5-20%', 0.05, 0.2], ['line <5%', 0, 0.05]];
const stats = new Map();
const add = (key, x) => { let s = stats.get(key); if (!s) stats.set(key, s = []); s.push(x); };
const ON = 0.05; // an action the range takes at least this often is on the path; rarer ones lead where the solution is not pinned down
for (const file of files) {
  const lines = readFileSync(new URL(file, dir), 'utf8').split('\n').filter(Boolean);
  // how often the range takes each action at each decision, in each solve
  const freq = new Map();
  for (const line of lines) { const r = JSON.parse(line); const key = `${r.id}|${r.dealt}`; let f = freq.get(key); if (!f) freq.set(key, f = r.sigma.map(() => ({ w: 0, a: r.actions.map(() => 0) }))); r.sigma.forEach((sg, i) => { f[i].w += r.reach[i]; sg.forEach((p, a) => { f[i].a[a] += r.reach[i] * p; }); }); }
  for (const line of lines) {
    const r = JSON.parse(line); const f = freq.get(`${r.id}|${r.dealt}`);
    const n = r.sigma.length; const R = n - 2; // candidates first, then the two references
    const pairs = []; for (let i = 0; i < R; i++) { pairs.push([`level ${i} v ref A`, i, R]); pairs.push([`level ${i} v ref B`, i, R + 1]); } pairs.push(['ref A v ref B', R, R + 1]);
    for (const [name, i, j] of pairs) {
      const lr = Math.min(...r.lineReach[i]); const street = `street ${r.round}`;
      const bucket = r.reach[i] < 0.05 ? 'hand <5%' : BUCKETS.find(([, lo, hi]) => lr >= lo && lr < hi)[0];
      const k = (q) => `${q}|${name}|${street} ${bucket}`;
      const on = r.actions.map((_, a) => Math.min(f[i].a[a] / f[i].w, f[j].a[a] / f[j].w) >= ON);
      const live = r.actions.map((_, a) => a).filter((a) => on[a]);
      // gaps among the actions on the path, from the best of them
      const gap = (v) => { const best = Math.max(...live.map((a) => v[a])); return v.map((x) => best - x); };
      if (r.best && live.length > 1) { const gi = gap(r.best[i]); const gj = gap(r.best[j]); for (const a of live) add(k('best-reply gap, on-path actions (% pot)'), Math.abs(gi[a] - gj[a])); }
      r.actions.forEach((_, a) => add(k('strategy (points)'), 100 * Math.abs(r.sigma[i][a] - r.sigma[j][a])));
      add(k('equity (points)'), 100 * Math.abs(r.equity[i] - r.equity[j]));
      for (const a of live) { const rep = r.reply[i][a]; if (!rep) continue; rep.forEach((x, e) => { add(k('his reply share (points)'), 100 * Math.abs(x[0] - r.reply[j][a][e][0])); add(k('reply value part (% pot)'), Math.abs(x[1] - r.reply[j][a][e][1])); }); }
      if (r.card) for (const a of live) { const ci = r.card[i][a]; const cj = r.card[j][a]; if (ci && cj && ci[0] > 0) { add(k('next card: value on the cards that lift the hand (% pot)'), Math.abs(ci[1] - cj[1])); add(k('next card: value on the other cards (% pot)'), Math.abs(ci[3] - cj[3])); } }
      // when he does not fold: what the action is then worth, per time it happens
      for (const a of live) { const cont = (s) => { const rep = r.reply[s][a]; if (!rep) return null; let share = 0, value = 0; rep.forEach((x, e) => { if (r.replyKinds?.[a]?.[e] === 'fold') return; share += x[0]; value += x[1]; }); return share > 0.05 ? value / share : null; }; const ci = cont(i), cj = cont(j); if (ci != null && cj != null) add(k('worth when he continues (% pot)'), Math.abs(ci - cj)); }
      for (let x = 0; x < live.length; x++) for (let y = x + 1; y < live.length; y++) for (const g of Object.keys(r.holding[i][live[x]])) {
        const d = (s) => (r.holding[s][live[x]][g]?.[1] ?? 0) - (r.holding[s][live[y]][g]?.[1] ?? 0);
        add(k('holding part of a gap (% pot)'), Math.abs(d(i) - d(j)));
      }
    }
  }
}
const rows = [...stats.entries()].map(([key, xs]) => { xs.sort((a, b) => a - b); const q = (p) => xs[Math.min(xs.length - 1, Math.floor(p * xs.length))]; const [what, pair, bucket] = key.split('|'); return { what, pair, bucket, n: xs.length, median: +q(0.5).toFixed(3), p99: +q(0.99).toFixed(3), p999: +q(0.999).toFixed(3), max: +xs[xs.length - 1].toFixed(3) }; });
rows.sort((a, b) => a.what.localeCompare(b.what) || a.pair.localeCompare(b.pair) || a.bucket.localeCompare(b.bucket));
let last = '';
for (const r of rows) { if (r.what !== last) { console.log(`\n${r.what}`); last = r.what; } console.log(`  ${r.pair.padEnd(17)} ${r.bucket.padEnd(22)} n=${String(r.n).padStart(8)}  median ${String(r.median).padStart(7)}  p99 ${String(r.p99).padStart(7)}  p99.9 ${String(r.p999).padStart(7)}  max ${String(r.max).padStart(8)}`); }
