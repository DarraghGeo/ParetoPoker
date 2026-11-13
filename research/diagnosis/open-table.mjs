// The solver's bet frequency by kind of hand at opening decisions, and how much of the per-hand
// frequency a table over kinds explains.   node diagnosis/open-table.mjs <open-hands.json>
import { readFileSync } from 'node:fs';
const rows = JSON.parse(readFileSync(process.argv[2]));
const BINS = [0, 0.2, 0.4, 0.6, 0.8, 0.9, 1.01];
const DRAWS = ['no draw', 'gutshot', 'strong draw', 'nut draw'];
const bin = (x) => BINS.findIndex((b, i) => x >= b && x < BINS[i + 1]);
for (const position of ['oop', 'ip']) {
  const set = rows.filter((r) => r.position === position);
  console.log(`\n${position}: ${set.length} decisions; the solver bets ${(100 * set.reduce((t, r) => t + r.level, 0) / set.length).toFixed(0)}% on average (from ${(100 * Math.min(...set.map((r) => r.level))).toFixed(0)}% to ${(100 * Math.max(...set.map((r) => r.level))).toFixed(0)}%)`);
  for (const [label, value] of [['bet frequency', (h, r) => h.bet], ['bet frequency relative to the decision\'s level', (h, r) => h.bet / Math.max(0.02, r.level)]]) {
    console.log(`  ${label}, by rank of strength now (columns) and draw (rows)`);
    console.log(`    ${''.padEnd(12)} ${BINS.slice(0, -1).map((b, i) => `${b}-${Math.min(1, BINS[i + 1])}`.padStart(9)).join('')}`);
    for (let d = 0; d < 4; d++) {
      const cells = BINS.slice(0, -1).map((_, k) => { let w = 0, s = 0; for (const r of set) for (const h of r.hands) if (h.draw === d && bin(h.rank) === k) { w += h.weight; s += h.weight * value(h, r); } return w > 3 ? (s / w).toFixed(2).padStart(9) : '        -'; });
      console.log(`    ${DRAWS[d].padEnd(12)} ${cells.join('')}`);
    }
  }
  // variance explained
  const all = set.flatMap((r) => r.hands.map((h) => ({ h, r })));
  const W = all.reduce((t, x) => t + x.h.weight, 0); const mean = all.reduce((t, x) => t + x.h.weight * x.h.bet, 0) / W;
  const sst = all.reduce((t, x) => t + x.h.weight * (x.h.bet - mean) ** 2, 0);
  const r2 = (predict) => (1 - all.reduce((t, x) => t + x.h.weight * (x.h.bet - predict(x)) ** 2, 0) / sst).toFixed(2);
  const table = (key, value = (x) => x.h.bet) => { const m = new Map(); for (const x of all) { const k = key(x); const e = m.get(k) ?? [0, 0]; e[0] += x.h.weight; e[1] += x.h.weight * value(x); m.set(k, e); } return (x) => { const e = m.get(key(x)); return e[1] / e[0]; }; };
  const kind = (x) => `${bin(x.h.rank)}/${x.h.draw}`;
  const rel = table(kind, (x) => x.h.bet / Math.max(0.02, x.r.level));
  console.log(`  share of the variation in per-hand bet frequency explained by:`);
  console.log(`    the decision's own level alone                          ${r2((x) => x.r.level)}`);
  console.log(`    a table over kinds (rank of strength now x draw)         ${r2(table(kind))}`);
  console.log(`    that table, scaled by the decision's level              ${r2((x) => Math.min(1, rel(x) * x.r.level))}`);
  console.log(`    a table over rank of strength now alone, scaled         ${r2((x) => Math.min(1, table((y) => bin(y.h.rank), (y) => y.h.bet / Math.max(0.02, y.r.level))(x) * x.r.level))}`);
  console.log(`    a table per decision over kinds (the best any kind table can do)   ${r2(table((x) => `${x.r.spot}/${kind(x)}`))}`);
}
