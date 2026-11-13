// Per spot, how much one variant gains over another, against how the spot is defined at hero's first decision.
//   node diagnosis/delta.mjs <set> <variant-file> <base variant> <new variant> <seat> <tuning rows.json>
import { readFileSync } from 'node:fs';
import { SETS, measure } from '../bin/compare.js';
const [set, file, a, b, seat, rowsFile] = process.argv.slice(2);
const { variants } = await import(new URL(file, `file://${process.cwd()}/`));
const allRows = JSON.parse(readFileSync(rowsFile)).filter((r) => r.kind === 'first to act');
const [ra, rb] = [await measure(SETS[set], variants[a]), await measure(SETS[set], variants[b])];
for (const one of seat === 'both' ? ['oop', 'ip'] : [seat]) {
  const profile = Object.fromEntries(allRows.filter((r) => r.position === one).map((r) => [r.spot, r.profile]));
  const pairs = ra.spots.filter((s) => s.hero === one).map((s) => ({ spot: s.spot, depth: s.depth, pair: s.pair, gain: s.exploited - rb.spots.find((x) => x.spot === s.spot && x.hero === one).exploited, p: profile[s.spot] })).filter((x) => x.p);
  const corr = (f) => { const n = pairs.length; const mx = pairs.reduce((t, x) => t + f(x), 0) / n; const my = pairs.reduce((t, x) => t + x.gain, 0) / n; let sxy = 0, sxx = 0, syy = 0; for (const x of pairs) { sxy += (f(x) - mx) * (x.gain - my); sxx += (f(x) - mx) ** 2; syy += (x.gain - my) ** 2; } return (sxy / Math.sqrt(sxx * syy)).toFixed(2); };
  console.log(`${one}: gain of "${b}" over "${a}" per spot (points of pot), ${pairs.length} spots; mean ${(100 * pairs.reduce((t, x) => t + x.gain, 0) / pairs.length).toFixed(2)}`);
  for (const k of ['rangeAdvantage', 'nutAdvantage', 'polarizationAdvantage', 'polarization', 'villainPolarization', 'nutShare', 'villainNutShare', 'spr']) console.log(`  correlation with ${k.padEnd(22)} ${corr((x) => x.p[k])}`);
  const group = (label, key) => { const m = {}; for (const x of pairs) (m[key(x)] ??= []).push(x.gain); console.log(`  by ${label}: ${Object.entries(m).sort().map(([k, v]) => `${k}: ${(100 * v.reduce((t, y) => t + y, 0) / v.length).toFixed(2)} (${v.length})`).join('  ')}`); };
  group('range advantage', (x) => (x.p.rangeAdvantage < -0.03 ? '1 behind' : x.p.rangeAdvantage < 0.1 ? '2 level' : '3 ahead'));
  group('nut advantage', (x) => (x.p.nutAdvantage < 0 ? '1 behind' : '2 ahead'));
  group('depth', (x) => `${x.depth}x`);
  group('pair', (x) => x.pair);
}
