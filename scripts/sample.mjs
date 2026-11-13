import * as fs from 'poker-flopsolve';
import { decisionAt, treeOf } from '../src/solver/flopsolve.js';
import { explain, survey } from '../src/explain/river.js';
const spot = fs.defineSpot({ board: 'Td 9d 6h Qc 7s', pot: 100, stack: 200, oop: '66+,A8s+,A5s-A4s,AJo+,K9s+,KQo,QTs+,JTs,96s+,85s+,75s+,65s,54s', ip: 'QQ-22,AQs-A2s,ATo+,K5s+,KJo+,Q8s+,J8s+,T7s+,96s+,86s+,75s+,64s+,53s+', betSizes: [[0.33, 0.75, 1.5]], raiseSizes: [{ times: 2.5 }], maxRaises: 2 });
const run = fs.createRun(spot, {}); run.step(400); const solution = run.snapshot(); const nodes = treeOf(fs, spot);
for (const [id, names] of [[0, ['AcAd', 'KdQd', '5s4s', 'AhKs', 'JsTs', '8c8s']], [nodes[0].edges[1].child, ['AcQc', 'Ac7c', '5s3s', 'KcJc', '8c8s']]]) {
  const d = decisionAt(fs, solution, nodes, id); const s = survey(d);
  console.log(`\n== ${d.seat} ${d.toCall ? 'facing ' + d.toCall : 'first to act'}: ${d.actions.map((a) => a.label).join(' / ')}`);
  for (const n of names) { const t = explain(s, n); if (!t) { console.log(n, '(not in range)'); continue; } console.log(`\n${n}  [${t.strategy.map((x) => Math.round(100 * x)).join(' ')}]  ${t.status}\n  LINE: ${t.line}`); for (const r of t.reasons) console.log(`  - (${r.basis}) ${r.text}`); }
}
