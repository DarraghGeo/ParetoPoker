// The evidence for proof 3: how far two fine solves disagree about what an action is "worth" when the
// solver's own values are used (the hand's later play as solved, trained or not), against the best reply.
import { fs, solveSpot } from './lib.mjs';
import { TURNS, config } from './spots.mjs';
import { frameAt, actionValues } from '../../src/explain/account.js';
import { evaluator } from '../../src/explain/best.js';
import { study } from '../../src/explain/street.js';
let solverGap = 0, bestGap = 0, n = 0;
for (const s of TURNS) {
  const solves = ['dcfr', 'cfr+'].map((algorithm) => { const spot = fs.defineSpot(config(s)); const run = fs.createRun(spot, { workers: 2, algorithm }); let e = 9; while (e > 0.01) { run.step(20); e = run.exploitabilityPercent(); } return { solution: run.snapshot() }; });
  const nodes = solveSpot(s, 5, { quiet: true, workers: 1 }).nodes; const pot0 = nodes[0].pot;
  for (const id of [0, nodes[0].edges[0].child]) {
    const st = solves.map((g) => study(fs, g.solution, nodes, id, [])); if (st.some((x) => !x) || Math.min(...st[0].lineReach) < 0.5) continue;
    const on = st[0].actions.map((a, i) => (a.on && st[1].actions[i].on ? i : -1)).filter((i) => i >= 0); if (on.length < 2) continue;
    const sv = solves.map((g, k) => actionValues(st[k].f)); const bv = solves.map((g, k) => evaluator(fs, g.solution, nodes)(st[k].f, 'best'));
    for (let c = 0; c < fs.COMBOS; c++) {
      if (Number.isNaN(sv[0][0][c]) || Number.isNaN(sv[1][0][c])) continue;
      for (const [vals, set] of [[sv, 'solver'], [bv, 'best']]) for (const a of on) {
        const gap = (k) => Math.max(...on.map((x) => vals[k][x][c])) - vals[k][a][c];
        const d = (100 * Math.abs(gap(0) - gap(1))) / pot0; if (set === 'solver') solverGap = Math.max(solverGap, d); else bestGap = Math.max(bestGap, d);
      }
      n++;
    }
  }
}
console.log(JSON.stringify({ what: 'largest disagreement between two references (0.01%) about how far an action is behind the best, main lines of six turn spots, % of the pot', hands: n, solverValues: +solverGap.toFixed(1), bestReply: +bestGap.toFixed(1) }));
