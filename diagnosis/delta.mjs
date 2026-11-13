// Per spot, how much one variant gains over another, against how the spot is defined at hero's first decision.
//   node diagnosis/delta.mjs <set> <variant-file> <base variant> <new variant> <seat> <tuning rows.json>
import { readFileSync } from 'node:fs';
import { SETS, measure } from '../bin/compare.js';
const [set, file, a, b, seat, rowsFile] = process.argv.slice(2);
const { variants } = await import(new URL(file, `file://${process.cwd()}/`));
const rows = JSON.parse(readFileSync(rowsFile)).filter((r) => r.kind === 'first to act' && r.position === seat);
const profile = Object.fromEntries(rows.map((r) => [r.spot, r.profile]));
const [ra, rb] = [await measure(SETS[set], variants[a]), await measure(SETS[set], variants[b])];
const pairs = ra.spots.filter((s) => s.hero === seat).map((s) => ({ spot: s.spot, depth: s.depth, pair: s.pair, gain: s.exploited - rb.spots.find((x) => x.spot === s.spot && x.hero === seat).exploited, p: profile[s.spot] })).filter((x) => x.p);
const corr = (f) => { const n = pairs.length; const mx = pairs.reduce((t, x) => t + f(x), 0) / n; const my = pairs.reduce((t, x) => t + x.gain, 0) / n; let sxy = 0, sxx = 0, syy = 0; for (const x of pairs) { sxy += (f(x) - mx) * (x.gain - my); sxx += (f(x) - mx) ** 2; syy += (x.gain - my) ** 2; } return (sxy / Math.sqrt(sxx * syy)).toFixed(2); };
console.log(`${seat}: gain of "${b}" over "${a}" per spot (points of pot), ${pairs.length} spots; mean ${(100 * pairs.reduce((t, x) => t + x.gain, 0) / pairs.length).toFixed(2)}`);
for (const k of ['rangeAdvantage', 'nutAdvantage', 'polarizationAdvantage', 'polarization', 'villainPolarization', 'nutShare', 'villainNutShare', 'spr']) console.log(`  correlation with ${k.padEnd(22)} ${corr((x) => x.p[k])}`);
const bins = [[-1, -0.1], [-0.1, -0.03], [-0.03, 0.03], [0.03, 0.1], [0.1, 1]];
for (const [lo, hi] of bins) { const set2 = pairs.filter((x) => x.p.rangeAdvantage >= lo && x.p.rangeAdvantage < hi); if (set2.length) console.log(`  range advantage ${lo} to ${hi}: ${set2.length} spots, gain ${(100 * set2.reduce((t, x) => t + x.gain, 0) / set2.length).toFixed(2)}`); }
for (const [lo, hi] of [[-1, -0.05], [-0.05, 0], [0, 0.05], [0.05, 1]]) { const set2 = pairs.filter((x) => x.p.nutAdvantage >= lo && x.p.nutAdvantage < hi); if (set2.length) console.log(`  nut advantage ${lo} to ${hi}: ${set2.length} spots, gain ${(100 * set2.reduce((t, x) => t + x.gain, 0) / set2.length).toFixed(2)}`); }
