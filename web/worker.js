// Solves a spot with poker-flopsolve off the main thread and answers questions about it.
import * as fs from 'poker-flopsolve';
import { decisionAt, treeOf } from '../src/solver/flopsolve.js';

let solution = null;
let nodes = null;
let job = 0;
const strip = (list) => list.map(({ id, kind, seat, pot, edges, parent, via, invested }) => ({ id, kind, seat, pot, edges, parent, via, invested }));

self.onmessage = async ({ data }) => {
  if (data.type === 'solve') {
    const mine = ++job;
    try {
      const c = data.config;
      const spot = fs.defineSpot({ board: c.board, pot: c.pot, stack: c.stack, oop: c.oop, ip: c.ip, betSizes: [c.bets], raiseSizes: c.raise > 0 ? [{ times: c.raise }] : undefined, maxRaises: c.raise > 0 ? c.maxRaises : 0 });
      if (spot.runouts.rounds !== 1) throw new Error('Five board cards are needed.');
      const run = fs.createRun(spot, {});
      const started = Date.now();
      let exploit = Infinity;
      while (mine === job && exploit > 0.05 && run.completed < 3000 && Date.now() - started < 8000) {
        run.step(50);
        exploit = run.exploitabilityPercent();
        self.postMessage({ type: 'progress', job: data.job, iterations: run.completed, exploit });
        await new Promise((resolve) => setTimeout(resolve));
      }
      if (mine !== job) return;
      solution = run.snapshot();
      nodes = treeOf(fs, spot);
      // Name each action as the solver does ('bet 33', 'raise 83')
      for (const node of nodes) if (node.kind === 'decision') { const labels = solution.strategyAt(node.id, 0).actions; node.edges.forEach((edge, k) => { edge.label = labels[k]; }); }
      self.postMessage({ type: 'solved', job: data.job, nodes: strip(nodes), exploit, iterations: run.completed, ms: Date.now() - started });
    } catch (error) {
      self.postMessage({ type: 'error', job: data.job, message: String(error?.message ?? error) });
    }
  } else if (data.type === 'decision' && solution) {
    self.postMessage({ type: 'decision', job: data.job, id: data.id, decision: decisionAt(fs, solution, nodes, data.id) });
  }
};
