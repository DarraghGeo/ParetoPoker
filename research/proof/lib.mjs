import * as fs from 'poker-flopsolve';
import { treeOf } from '../../src/solver/flopsolve.js';
import { config } from './spots.mjs';
export { fs };
/** Solve a battery spot to a target accuracy (% of pot). */
export function solveSpot(s, target, { cap = 4000, workers = 3, quiet = false } = {}) {
  const spot = fs.defineSpot(config(s));
  const run = fs.createRun(spot, { workers });
  const t = Date.now(); let e = Infinity; const step = spot.board.length === 5 ? 50 : spot.board.length === 4 ? 20 : 5;
  while (e > target && run.completed < cap) { run.step(step); e = run.exploitabilityPercent(); }
  if (!quiet) console.error(`  solved ${s.name}: ${run.completed} iterations, ${e.toFixed(3)}%, ${((Date.now() - t) / 1000).toFixed(1)}s`);
  return { spot, run, solution: run.snapshot(), nodes: treeOf(fs, spot), exploit: e };
}
/** Decisions worth looking at: reached by both ranges, on a few real runouts. Yields { id, dealt }. */
export function* decisions(g, { perRound = [99, 3, 2], seed = 7 } = {}) {
  const { spot, nodes } = g; let state = seed;
  const rand = () => { state = (state * 1103515245 + 12345) & 0x7fffffff; return state / 0x7fffffff; };
  const deck = (used) => { const out = []; for (let c = 0; c < 52; c++) if (!used.includes(c)) out.push(c); return out; };
  const walk = function* (id, dealt) {
    const node = nodes[id];
    if (node.kind === 'decision') { yield { id, dealt }; for (const e of node.edges) yield* walk(e.child, dealt); }
    else if (node.kind === 'chance') { const free = deck([...spot.board, ...dealt]); const n = perRound[node.round + 1] ?? 1; for (let k = 0; k < n; k++) yield* walk(node.edges[0].child, [...dealt, free[Math.floor(rand() * free.length)]]); }
  };
  yield* walk(0, []);
}
