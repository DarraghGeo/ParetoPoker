// A decision, studied: everything an explanation of one of its hands may quote, gathered once and read per hand.
import { frameAt } from '../account.js';
import { evaluator } from '../best.js';
import { features } from '../features.js';
import { equityVs } from '../../solver/flopsolve.js';
import { fifthsOf } from './fifths.js';
import { drawParts, nextCards } from './cards-to-come.js';

/** An action the range takes at least this often is on the path; a rarer one leads where the solution is not pinned down. */
export const ON_PATH = 0.05;

/** A value made the first time it is asked for. */
function once(make) {
  let made = false; let value;
  return () => { if (!made) { value = make(); made = true; } return value; };
}

/** A value per key, made the first time each is asked for. */
function perKey(make) {
  const kept = new Map();
  return (key) => { let x = kept.get(key); if (!x) kept.set(key, x = make(key)); return x; };
}

/** How often each hand takes each action here: `sigma(combo, action)`. */
function strategyOf(fs, solution, id, f) {
  const view = solution.strategyAt(id, f.at); const n = view.actions.length;
  const row = new Int32Array(fs.COMBOS).fill(-1); view.combos.forEach((c, i) => { row[c] = i; });
  return { n, sigma: (c, a) => { const i = row[f.stored[c]]; return i < 0 ? 0 : view.probs[i * n + a]; } };
}

function actionOf(edge, nodes, freq) {
  const child = nodes[edge.child];
  const replies = child.kind === 'decision' ? child.edges.map((x) => ({ kind: x.kind, label: x.label })) : null;
  return { kind: edge.kind, label: edge.label, freq, on: freq >= ON_PATH, endsStreet: child.kind === 'chance', replies };
}

/** Each action with how often the range takes it. */
function rangeActions(fs, f, nodes, { n, sigma }) {
  let total = 0; const taken = f.node.edges.map(() => 0);
  for (let c = 0; c < fs.COMBOS; c++) if (f.mine[c] > 0) { total += f.mine[c]; for (let a = 0; a < n; a++) taken[a] += f.mine[c] * sigma(c, a); }
  return f.node.edges.map((e, a) => actionOf(e, nodes, taken[a] / total));
}

/** How much of each starting range takes this line. */
function lineReachOf(fs, solution, f) {
  const sum = (v) => { let t = 0; for (let c = 0; c < fs.COMBOS; c++) t += v[c]; return t; };
  return [sum(f.mine) / sum(solution.reachAt(0, 0, f.me)), sum(f.his) / sum(solution.reachAt(0, 0, 1 - f.me))];
}

export function study(fs, solution, nodes, id, dealt = []) {
  const f = frameAt(fs, solution, nodes, id, dealt);
  if (!f) return null;
  const strategy = strategyOf(fs, solution, id, f); const { sigma } = strategy;
  const featuresOf = perKey((c) => features(fs, f.board, c));
  const best = evaluator(fs, solution, nodes);
  // (the split by what he holds is not asked for: it does not survive the proof, see PROOF.md)
  const closely = perKey((a) => best.closely(f, a, null));
  const equity = once(() => equityVs(fs, f.board, f.mine, f.his));
  const bands = once(() => fifthsOf({ fs, f, ...strategy, featuresOf, equity }));
  const spread = once(() => nextCards(fs, f)); const parts = once(() => drawParts(fs, f, equity()));
  const toCall = f.node.invested[1 - f.me] - f.node.invested[f.me];
  return { fs, f, solution, dealt, pot: f.node.pot, toCall, actions: rangeActions(fs, f, nodes, strategy), lineReach: lineReachOf(fs, solution, f),
    sigma, featuresOf, closely, bands, spread, drawParts: parts, equity };
}
