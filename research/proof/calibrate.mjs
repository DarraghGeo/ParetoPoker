// What do the solver's values mean before the river? Establish the scale on terminals whose value is known.
import * as fs from 'poker-flopsolve';
import { treeOf } from '../../src/solver/flopsolve.js';
const cc = (c) => [fs.COMBO_CARDS[2 * c], fs.COMBO_CARDS[2 * c + 1]];
for (const board of ['Td9d6hQc7s', 'Td9d6hQc', 'Td9d6h']) {
  const spot = fs.defineSpot({ board, pot: 100, stack: 200, oop: 'AA,KK,76s,A5s,QJs', ip: 'QQ,JJ,98s,KQs,87s', betSizes: [[0.5]], raiseSizes: [{ times: 3 }], maxRaises: 2 });
  const run = fs.createRun(spot, {}); run.step(200); const sol = run.snapshot(); const nodes = treeOf(fs, spot); const ctx = run.solver.ctx;
  const me = 0; const mine = sol.reachAt(0, 0, 0), his = sol.reachAt(0, 0, 1);
  const active = ctx.active; const slot = (active.roundBase[0] + 0) * 2 + me; const live = active.list.subarray(active.start[slot], active.start[slot] + active.count[slot]);
  // root: OOP bets, IP folds -> OOP wins the pot as it stood
  const bet = nodes[0].edges.find((e) => e.kind === 'bet'); const facing = nodes[bet.child]; const foldEdge = facing.edges.find((e) => e.kind === 'fold');
  const v = run.solver.valuesAt(foldEdge.child, 0, me, mine, his, live, live.length);
  const taken = new Set(spot.board);
  const out = [];
  for (let h = 0; h < fs.COMBOS && out.length < 3; h++) { if (!(mine[h] > 0)) continue; const [a, b] = cc(h); if (taken.has(a) || taken.has(b)) continue; let mass = 0; for (let x = 0; x < fs.COMBOS; x++) { if (!(his[x] > 0)) continue; const [p, q] = cc(x); if (p === a || p === b || q === a || q === b || taken.has(p) || taken.has(q)) continue; mass += his[x]; } out.push(`${fs.formatCombo(h)} v=${v[h].toFixed(3)} mass=${mass} v/mass=${(v[h] / mass).toFixed(4)}`); }
  console.log(board, 'runoutWeight', Array.from(ctx.runoutWeight), 'chipScale', ctx.chipScale, 'totalMass', ctx.totalMass, 'pot at fold node', nodes[foldEdge.child].pot, 'invested', nodes[foldEdge.child].invested);
  console.log('  fold-node values:', out.join(' | '));
  // the whole game: sum of root values against the solution's own EV
  const kids = nodes[0].edges.map((e) => run.solver.valuesAt(e.child, 0, me, mine, his, live, live.length)); const view = sol.strategyAt(0, 0); let total = 0;
  view.combos.forEach((c, i) => { for (let a = 0; a < kids.length; a++) total += mine[c] * view.probs[i * kids.length + a] * kids[a][c]; });
  console.log('  sum of root values', total.toFixed(3), '/ totalMass =', (total / ctx.totalMass).toFixed(4), ' solution.ev(0) =', sol.ev(0).toFixed(4), 'ev(1)', sol.ev(1).toFixed(4));
}
