// Per pair and per depth, how two variants compare for one seat.  node diagnosis/bygroup.mjs <sets,comma> <file> <a> <b> <seat>
import { SETS, measure } from '../bin/compare.js';
const [sets, file, a, b, seat] = process.argv.slice(2);
const { variants } = await import(new URL(file, `file://${process.cwd()}/`));
const rows = [];
for (const set of sets.split(',')) {
  const [ra, rb] = [await measure(SETS[set], variants[a]), await measure(SETS[set], variants[b])];
  for (const s of ra.spots.filter((x) => x.hero === seat)) rows.push({ ...s, set, other: rb.spots.find((x) => x.spot === s.spot && x.hero === seat).exploited });
}
const show = (label, key) => { const m = {}; for (const r of rows) (m[key(r)] ??= []).push(r); console.log(label); for (const [k, v] of Object.entries(m)) console.log(`   ${String(k).padEnd(12)} ${v.length} spots: "${a}" ${(100 * v.reduce((t, r) => t + r.exploited, 0) / v.length).toFixed(1)}  "${b}" ${(100 * v.reduce((t, r) => t + r.other, 0) / v.length).toFixed(1)}`); };
show('by pair', (r) => r.pair ?? 'A'); show('by depth', (r) => r.depth ?? 'n/a'); show('by board', (r) => r.board);
