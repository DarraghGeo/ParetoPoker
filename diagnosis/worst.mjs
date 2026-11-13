// The spots where a variant loses most.  node diagnosis/worst.mjs <set> <variant-file> <variant name> <setting> [count]
import { SETS, measure } from '../bin/compare.js';
const [set, file, name, setting = 'engine', count = '10'] = process.argv.slice(2);
const { variants } = await import(new URL(file, `file://${process.cwd()}/`));
const SITUATIONS = { open: (d) => !d.facing, bet: (d) => d.facing && d.raises === 0, raise: (d) => d.facing && d.raises > 0 };
const options = setting === 'engine' ? {} : setting === 'ranges' ? { ranges: 'solver', where: () => true } : { ranges: 'solver', where: SITUATIONS[setting] };
const r = await measure(SETS[set], variants[name], options);
const by = (key) => { const m = {}; for (const s of r.spots) { const k = `${s.hero} ${key(s)}`; (m[k] ??= []).push(s.exploited); } return Object.entries(m).map(([k, v]) => `${k}: ${(100 * v.reduce((a, b) => a + b, 0) / v.length).toFixed(1)}`).join('  '); };
console.log('by pair  ', by((s) => s.pair)); console.log('by depth ', by((s) => `${s.depth}x`));
for (const s of [...r.spots].sort((a, b) => b.exploited - a.exploited).slice(0, Number(count))) console.log(`  ${s.hero.padEnd(4)} ${s.spot.padEnd(22)} ${(100 * s.exploited).toFixed(1)}`);
