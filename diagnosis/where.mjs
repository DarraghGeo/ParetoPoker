// Which kinds of spot does a preset lose most in? Per spot and seat, the loss to the best
// response against how the spot is defined at that seat's first decision.
//   node diagnosis/where.mjs <set> <preset> <tuning rows.json>
import { readFileSync } from 'node:fs';
import { SELECTORS, SETS, measure } from '../bin/compare.js';
const [set, preset, rowsFile] = process.argv.slice(2);
const rows = JSON.parse(readFileSync(rowsFile)).filter((r) => r.kind === 'first to act');
const profile = Object.fromEntries(rows.map((r) => [`${r.spot}/${r.position}`, r.profile]));
const r = await measure(SETS[set], SELECTORS[preset]);
const data = r.spots.map((s) => ({ ...s, p: profile[`${s.spot}/${s.hero}`] })).filter((x) => x.p);
for (const seat of ['oop', 'ip']) {
  const d = data.filter((x) => x.hero === seat); const n = d.length;
  const mean = d.reduce((t, x) => t + x.exploited, 0) / n;
  const corr = (f) => { const mx = d.reduce((t, x) => t + f(x), 0) / n; let sxy = 0, sxx = 0, syy = 0; for (const x of d) { sxy += (f(x) - mx) * (x.exploited - mean); sxx += (f(x) - mx) ** 2; syy += (x.exploited - mean) ** 2; } return (sxy / Math.sqrt(sxx * syy)).toFixed(2); };
  console.log(`${seat}: ${n} spots, mean loss ${(100 * mean).toFixed(2)}; correlation of the loss with: ${['rangeAdvantage', 'nutAdvantage', 'polarizationAdvantage', 'polarization', 'villainPolarization', 'spr'].map((k) => `${k} ${corr((x) => x.p[k])}`).join(', ')}`);
  const group = (label, key) => { const m = {}; for (const x of d) (m[key(x)] ??= []).push(x.exploited); console.log(`   by ${label}: ${Object.entries(m).sort().map(([k, v]) => `${k}: ${(100 * v.reduce((a, b) => a + b, 0) / v.length).toFixed(1)} (${v.length})`).join('  ')}`); };
  group('pair', (x) => x.pair); group('depth', (x) => `${x.depth}x`);
  group('range advantage', (x) => (x.p.rangeAdvantage < -0.05 ? '1 behind' : x.p.rangeAdvantage < 0.05 ? '2 level' : '3 ahead'));
  group('nut advantage', (x) => (x.p.nutAdvantage < -0.03 ? '1 behind' : x.p.nutAdvantage < 0.03 ? '2 level' : '3 ahead'));
  console.log(`   worst: ${[...d].sort((a, b) => b.exploited - a.exploited).slice(0, 6).map((x) => `${x.spot} ${(100 * x.exploited).toFixed(0)}`).join(' | ')}`);
}
