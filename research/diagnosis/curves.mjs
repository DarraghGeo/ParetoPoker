// The solver's mixing curves: how often each slice of the range (by equity, weakest first) takes
// each kind of action, averaged over decisions.   node diagnosis/curves.mjs <rows.json> [depth]
import { readFileSync } from 'node:fs';
const rows = JSON.parse(readFileSync(process.argv[2])).filter((r) => r.curve && (!process.argv[3] || String(r.depth) === process.argv[3]));
const kindsOf = (r) => r.actions.map((a) => (a.type === 'fold' || a.type === 'check' ? 'passive' : a.type === 'call' ? 'call' : a.pots < 0.5 ? 'small' : a.pots <= 1.01 ? 'mid' : 'big'));
for (const position of ['oop', 'ip']) for (const kind of ['first to act', 'facing a bet', 'facing a raise']) {
  const set = rows.filter((r) => r.position === position && r.kind === kind);
  if (!set.length) continue;
  const cols = kind === 'first to act' ? ['passive', 'small', 'mid', 'big'] : ['passive', 'call', 'small', 'mid', 'big'];
  console.log(`\n${position}, ${kind} (${set.length} decisions): share of each slice of the range taking each action; sd across decisions of the aggressive share`);
  console.log(`  slice  equity  ${cols.map((c) => (c === 'passive' ? (kind === 'first to act' ? 'check' : 'fold') : c === 'small' && kind !== 'first to act' ? 'raise' : c).padStart(6)).join('')}   sd(bet or raise)`);
  for (let k = 0; k < 20; k++) {
    let W = 0; const sums = Object.fromEntries(cols.map((c) => [c, 0])); let eq = 0; const agg = [];
    for (const r of set) {
      const s = r.curve[k]; if (!(s.weight > 0)) continue; const kinds = kindsOf(r);
      W += r.reach; eq += r.reach * s.equity; let a = 0;
      s.actions.forEach((x, i) => { const c = kind !== 'first to act' && kinds[i] !== 'passive' && kinds[i] !== 'call' ? 'small' : kinds[i]; sums[c] += r.reach * x; if (kinds[i] !== 'passive' && kinds[i] !== 'call') a += x; });
      agg.push(a);
    }
    const m = agg.reduce((t, x) => t + x, 0) / agg.length; const sd = Math.sqrt(agg.reduce((t, x) => t + (x - m) ** 2, 0) / agg.length);
    console.log(`  ${String(k * 5).padStart(3)}%   ${(eq / W).toFixed(2)}   ${cols.filter((c) => kind === 'first to act' || !['mid', 'big'].includes(c)).map((c) => (100 * sums[c] / W).toFixed(0).padStart(6)).join('')}   ${sd.toFixed(2)}`);
  }
}
