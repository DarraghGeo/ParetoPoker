// AUDIT of the river explanations already on the page, by the standard the turn and flop ones are held to.
// Each sentence the river explainer writes at page accuracy (0.05% of the pot) is compared with what it
// writes about the same hand in two far finer solves (0.005%, two algorithms): is the sentence there at
// all, and how far apart are the numbers in it? Sentences are told apart by their id.
import { fs, solveSpot, decisions } from './lib.mjs';
import { WIDE_OOP, WIDE_IP, config } from './spots.mjs';
import { decisionAt } from '../../src/solver/flopsolve.js';
import { survey, explain } from '../../src/explain/river.js';
const BTN = '22+,A2s+,A7o+,K6s+,KTo+,Q8s+,QTo+,J8s+,JTo,T8s+,97s+,87s,76s,65s'; const BB = '99-22,AJs-A2s,AJo-A8o,K2s+,K9o+,Q6s+,QTo+,J7s+,JTo,T7s+,96s+,85s+,75s+,64s+,54s';
const RIVERS = [
  { name: 'river default', board: 'Td9d6hQc7s', oop: WIDE_OOP, ip: WIDE_IP, betSizes: [[0.33, 0.75, 1.5]], raiseSizes: [{ times: 2.5 }], maxRaises: 2 },
  { name: 'river dry', board: 'Ks7h3d2c9s', oop: BB, ip: BTN, betSizes: [[0.5, 1]], raiseSizes: [{ times: 3 }], maxRaises: 2 },
  { name: 'river flush', board: 'As9s4s8h2d', oop: BB, ip: BTN, betSizes: [[0.33, 1]], raiseSizes: [{ times: 3 }], maxRaises: 2 },
  { name: 'river paired', board: 'JhJc5d9s3c', oop: BB, ip: BTN, betSizes: [[0.66]], raiseSizes: [{ times: 2.5 }], maxRaises: 2 },
  { name: 'river four straight', board: '8h7h5c2c6d', oop: WIDE_OOP, ip: WIDE_IP, betSizes: [[0.75]], raiseSizes: [{ times: 3 }], maxRaises: 2 },
  { name: 'river brick', board: 'QhTh4c2d3s', oop: WIDE_OOP, ip: BTN, stack: 300, betSizes: [[0.33, 0.75, 1.5]], raiseSizes: [{ times: 3 }], maxRaises: 2 },
];
const other = (s, algorithm, target) => { const spot = fs.defineSpot(config(s)); const run = fs.createRun(spot, { workers: 1, algorithm }); let e = 9; while (e > target && run.completed < 60000) { run.step(50); e = run.exploitabilityPercent(); } return { spot, run, solution: run.snapshot(), exploit: e }; };
const numbers = (text) => (text.match(/-?\d+(\.\d+)?(?=%| points| of the time)/g) ?? text.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
const stats = new Map(); const note = (key) => { let s = stats.get(key); if (!s) stats.set(key, s = { made: 0, missing: 0, diffs: [] }); return s; };
for (const s of RIVERS) {
  const page = solveSpot(s, 0.05, { workers: 1, quiet: true });
  const refs = ['dcfr', 'cfr+'].map((algorithm) => ({ ...other(s, algorithm, 0.005), nodes: page.nodes }));
  const start = [0, 1].map((p) => page.solution.reachAt(0, 0, p).reduce((t, x) => t + x, 0));
  for (const { id } of decisions(page)) {
    const d = decisionAt(fs, page.solution, page.nodes, id); if (!d) continue;
    const me = d.seat === 'oop' ? 0 : 1; const lr = Math.min(d.hands.reduce((t, h) => t + h.weight, 0) / start[me], d.villain.reduce((t, h) => t + h.weight, 0) / start[1 - me]);
    if (lr < 0.05) continue; const bucket = lr >= 0.5 ? 'line 50%+' : lr >= 0.2 ? 'line 20-50%' : 'line 5-20%';
    const sv = survey(d); const others = refs.map((g) => { const dd = decisionAt(fs, g.solution, g.nodes, id); return dd ? survey(dd) : null; });
    for (const row of sv.rows) {
      const told = explain(sv, row.hand.name); if (!told) continue;
      const theirs = others.map((o) => (o ? explain(o, row.hand.name) : null));
      const mine = [{ id: 'LEAD', text: told.line }, ...told.reasons];
      for (const r of mine) {
        // the lead is one of several sentences: tell them apart by how they begin
        const kind = r.id === 'LEAD' ? `lead: ${r.text.replace(/^You have [^.:]*?(, [^:.]*)?[:.] (it beats \d+% of his range\. )?/, '').split(/[ ,:]/).slice(0, 3).join(' ')}` : r.id;
        const st = note(`${kind}|${bucket}`); st.made++;
        const mineNums = numbers(r.text);
        for (const t of theirs) {
          const match = t && (r.id === 'LEAD' ? { text: t.line } : t.reasons.find((x) => x.id === r.id));
          const sameKind = match && (r.id !== 'LEAD' || match.text.replace(/\d+(\.\d+)?/g, '#').slice(0, 60) === r.text.replace(/\d+(\.\d+)?/g, '#').slice(0, 60) || true);
          if (!match || !sameKind) { st.missing++; continue; }
          const their = numbers(match.text);
          if (their.length !== mineNums.length) { st.missing++; continue; }
          st.diffs.push(Math.max(0, ...mineNums.map((x, i) => Math.abs(x - their[i]))));
        }
      }
    }
  }
  console.error(`  ${s.name}: page ${page.exploit.toFixed(3)}%, refs ${refs.map((r) => r.exploit.toFixed(4)).join(' ')}`);
}
const rows = [...stats.entries()].map(([key, s]) => { s.diffs.sort((a, b) => a - b); const q = (p) => (s.diffs.length ? s.diffs[Math.min(s.diffs.length - 1, Math.floor(p * s.diffs.length))] : NaN); const [kind, bucket] = key.split('|'); return { kind, bucket, made: s.made, missing: `${((100 * s.missing) / (2 * s.made)).toFixed(1)}%`, p50: q(0.5), p99: q(0.99), max: q(1) }; }).sort((a, b) => a.bucket.localeCompare(b.bucket) || a.kind.localeCompare(b.kind));
for (const r of rows) console.log(`${r.bucket.padEnd(12)} ${r.kind.padEnd(34)} made ${String(r.made).padStart(5)}  absent or reshaped in a reference ${r.missing.padStart(6)}  largest number difference: median ${r.p50}  p99 ${r.p99}  max ${r.max}`);
