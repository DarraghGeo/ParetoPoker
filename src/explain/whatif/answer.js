// One version of the street solved: how often the range at the decision folds (facing a bet) or bets.
import { treeOf } from '../../solver/flopsolve.js';
import { study } from '../street.js';

/** Solved until close enough, the time budget runs out, or 3000 iterations. */
function solved(fs, cfg, { board, target, budget }) {
  const sp = fs.defineSpot(cfg); const run = fs.createRun(sp, {}); const t0 = Date.now(); let e = 9;
  while (e > target && Date.now() - t0 < budget && run.completed < 3000) { run.step(board.length === 5 ? 40 : 10); e = run.exploitabilityPercent(); }
  return { sp, run };
}

/** The decision the same actions lead to in the new tree, or null where they do not lead to one. */
function decisionAlong(tree, path) {
  let at = 0;
  for (const label of path) {
    const edge = tree[at].edges.find((x) => x.label === label);
    if (!edge) return null;
    at = edge.child;
  }
  return tree[at].kind === 'decision' ? at : null;
}

const wager = (k) => !['check', 'call', 'fold'].includes(k);
const shareTaken = (st, facing) => (facing
  ? st.actions.reduce((t, x) => t + (x.kind === 'fold' ? x.freq : 0), 0)
  : st.actions.reduce((t, x) => t + (wager(x.kind) ? x.freq : 0), 0));

/** @param {{ path: string[], board: number[], facing: boolean, target: number, budget: number }} play */
export function answer(fs, play, cfg) {
  const { sp, run } = solved(fs, cfg, play);
  const tree = treeOf(fs, sp);
  const at = decisionAlong(tree, play.path);
  if (at == null) return null;
  const st = study(fs, run.snapshot(), tree, at, []);
  return st ? shareTaken(st, play.facing) : null;
}
