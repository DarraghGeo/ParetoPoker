// NOT PROVEN, with the evidence: the split of an action's worth by what he holds.
// Two reference solves of each turn spot (0.01% of the pot, two algorithms). At main-line decisions, for
// every hand and every pair of actions the range uses, the part of their difference in worth that comes
// against each group of his hands is compared between the two solves.
import { fs, solveSpot } from './lib.mjs';
import { TURNS, config } from './spots.mjs';
import { frameAt } from '../../src/explain/account.js';
import { evaluator } from '../../src/explain/best.js';
import { features, groupOf } from '../../src/explain/features.js';
import { study } from '../../src/explain/street.js';
const diffs = []; const shares = [];
for (const s of TURNS) {
  const solves = ['dcfr', 'cfr+'].map((algorithm) => { const spot = fs.defineSpot(config(s)); const run = fs.createRun(spot, { workers: 2, algorithm }); let e = 9; while (e > 0.01) { run.step(20); e = run.exploitabilityPercent(); } return { spot, solution: run.snapshot() }; });
  const nodes = solveSpot(s, 5, { quiet: true, workers: 1 }).nodes;
  for (const id of [0, nodes[0].edges[0].child]) {
    const st = solves.map((g) => study(fs, g.solution, nodes, id, [])); if (st.some((x) => !x) || Math.min(...st[0].lineReach) < 0.5) continue;
    const feats = new Map(); const group = (c) => { let g = feats.get(c); if (!g) feats.set(c, g = groupOf(features(fs, st[0].f.board, c))); return g; };
    const on = st[0].actions.map((a, i) => (a.on && st[1].actions[i].on ? i : -1)).filter((i) => i >= 0);
    const close = solves.map((g, k) => { const best = evaluator(fs, g.solution, nodes); return on.map((a) => best.closely(st[k].f, a, group)); });
    const pot = st[0].pot;
    for (let c = 0; c < fs.COMBOS; c++) {
      if (!(st[0].f.mine[c] > 0) || !(st[1].f.mine[c] > 0) || !(st[0].f.mass[c] > 0)) continue;
      for (let x = 0; x < on.length; x++) for (let y = x + 1; y < on.length; y++) for (const g of close[0][x].holdings.keys()) {
        const part = (k) => (100 * ((close[k][x].holdings.get(g)?.value[c] ?? 0) - (close[k][y].holdings.get(g)?.value[c] ?? 0))) / pot;
        diffs.push(Math.abs(part(0) - part(1)));
      }
      for (const g of close[0][0].holdings.keys()) shares.push(100 * Math.abs((close[0][0].holdings.get(g)?.share[c] ?? 0) - (close[1][0].holdings.get(g)?.share[c] ?? 0)));
    }
  }
}
const q = (xs, p) => { xs.sort((a, b) => a - b); return +xs[Math.min(xs.length - 1, Math.floor(p * xs.length))].toFixed(2); };
console.log(JSON.stringify({ what: 'part of a difference in worth, by his holding: two references compared (% pot)', comparisons: diffs.length, median: q(diffs, 0.5), p99: q(diffs, 0.99), p999: q(diffs, 0.999), max: q(diffs, 1), shareOfHisRangeByGroup: { comparisons: shares.length, median: q(shares, 0.5), p99: q(shares, 0.99), max: q(shares, 1) } }));
