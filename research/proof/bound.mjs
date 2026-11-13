// Does the error of a best-reply gap obey a bound of the form  K x exploitability / (how often the action is reached)?
// For every hand, on-path action and pair of solves: ratio = |difference in gap| x reach / exploitability.
import { readFileSync, readdirSync } from 'node:fs';
const dir = new URL('./out/', import.meta.url); const want = process.argv[2] ?? '';
const files = readdirSync(dir).filter((f) => f.startsWith('stability-') && f.endsWith('.jsonl') && f.includes(want));
const levels = (process.argv[3] ?? '0.3,0.1,0.05').split(',').map(Number); const REF = 0.01; const ON = 0.05;
const out = new Map(); const add = (k, x) => { let s = out.get(k); if (!s) out.set(k, s = []); s.push(x); };
for (const file of files) {
  const lines = readFileSync(new URL(file, dir), 'utf8').split('\n').filter(Boolean);
  const freq = new Map();
  for (const line of lines) { const r = JSON.parse(line); const key = `${r.id}|${r.dealt}`; let f = freq.get(key); if (!f) freq.set(key, f = r.sigma.map(() => ({ w: 0, a: r.actions.map(() => 0) }))); r.sigma.forEach((sg, i) => { f[i].w += r.reach[i]; sg.forEach((p, a) => { f[i].a[a] += r.reach[i] * p; }); }); }
  for (const line of lines) {
    const r = JSON.parse(line); const f = freq.get(`${r.id}|${r.dealt}`); const n = r.sigma.length; const R = n - 2;
    const pairs = []; for (let i = 0; i < R; i++) pairs.push([`level ${levels[i]}`, i, R, levels[i]], [`level ${levels[i]}`, i, R + 1, levels[i]]); pairs.push(['ref v ref', R, R + 1, REF]);
    for (const [name, i, j, eps] of pairs) {
      const fr = (s, a) => f[s].a[a] / f[s].w;
      const live = r.actions.map((_, a) => a).filter((a) => Math.min(fr(i, a), fr(j, a)) >= ON); if (live.length < 2) continue;
      const line = Math.min(r.lineReach[i][0] * r.lineReach[i][1], r.lineReach[j][0] * r.lineReach[j][1]);
      const bestOf = (v) => live.reduce((b, a) => (v[a] > v[b] ? a : b), live[0]);
      const gi = live.map((a) => r.best[i][bestOf(r.best[i])] - r.best[i][a]); const gj = live.map((a) => r.best[j][bestOf(r.best[j])] - r.best[j][a]);
      live.forEach((a, x) => { const rho = line * Math.min(fr(i, a), fr(j, a)); const err = Math.abs(gi[x] - gj[x]); add(`${name}|street ${r.round}`, { ratio: (err * rho) / eps, err, rho }); });
    }
  }
}
for (const [k, xs] of [...out.entries()].sort()) { const rs = xs.map((x) => x.ratio).sort((a, b) => a - b); const q = (p) => rs[Math.min(rs.length - 1, Math.floor(p * rs.length))]; const top = xs.reduce((b, x) => (x.ratio > b.ratio ? x : b)); console.log(`${k.padEnd(24)} n=${String(rs.length).padStart(7)}  ratio median ${q(0.5).toFixed(3)}  p99 ${q(0.99).toFixed(2)}  p99.9 ${q(0.999).toFixed(2)}  max ${rs[rs.length - 1].toFixed(2)}   (worst: error ${top.err.toFixed(2)}% pot at reach ${top.rho.toFixed(4)})`); }
