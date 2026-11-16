// The solves the workers run, each a job stepped a chunk at a time: `step()` returns null until the solve is done, then
// its result; `done()` says how far along it is (0 to 1). A flop is solved lite and stops when its first decisions stop
// moving; a turn or river is a street solved again for the two ranges as they arrive at the end of a line.
import * as fs from 'poker-flopsolve';
import { treeOf } from '../../src/solver/flopsolve.js';
import { bettingFor } from './betting.js';
import { mass, onBoard, text } from './deck.js';
import { along } from './progress.js';

/** How finely each street is solved (exploitability, % of the pot), for how long at most, in chunks of how many iterations. */
export const PLAN = {
  flop: { patience: 90000, chunk: 5 },
  turn: { target: 0.3, patience: 12000, chunk: 5 },
  river: { target: 0.05, patience: 4000, chunk: 50 },
};
const STREET = ['flop', 'turn', 'river'];
export const streetOf = (cards) => STREET[cards.length - 3];
/** Betting to fall back on when a flop is too big to hold with the setup's: fewer sizes, then one a street. */
const SIMPLER = [{ bets: [[0.33, 0.75], [0.33, 0.75], [0.75]] }, { bets: [[0.33], [0.33], [0.75]] }, { bets: [[0.33], [0.75], [0.75]], raises: [], maxRaises: 0 }];
/** A street is solved again only when both ranges arriving hold at least this much. */
const ENOUGH = 1;

/** Time one call, adding it to the job's running total. */
function timed(state, work) {
  const started = Date.now(); const out = work(); state.spent += Date.now() - started;
  return out;
}

/** The flop of `cards`, solved lite with the setup's ranges; `warm`: a nearby flop's run and the relabelling onto this one. */
export function flopJob(config, cards, warm = null) {
  const state = { spent: 0, run: null, settled: false };
  const open = (betting) => {
    state.used = betting;
    state.lite = fs.litePreset({ board: text(cards), pot: config.pot, stack: config.stack, oop: config.oop, ip: config.ip, ...bettingFor({ ...config, ...betting }, 3) });
    state.spot = fs.defineSpot(state.lite.config); state.settle = fs.trackSettle(state.lite.options.settle || {});
    state.run = fs.createRun(state.spot, { ...state.lite.options, ...(warm ? { warmStart: warm.run, warmCards: warm.cards } : {}) });
  };
  // wide ranges with many sizes can be too big to hold: the setup's betting first, then fewer sizes until it fits
  const begin = () => {
    let failed;
    for (const betting of [{}, ...SIMPLER]) { try { open(betting); return; } catch (e) { failed = e; state.run = null; } }
    throw failed;
  };
  const step = () => {
    if (!state.run) begin();
    timed(state, () => state.run.step(PLAN.flop.chunk));
    if (state.run.completed % (state.lite.options.settle?.every ?? 20) === 0) state.settled = state.settle.check(state.run.snapshot(), state.run.completed);
    if (!state.settled && state.run.completed < state.lite.options.iterations && state.spent < PLAN.flop.patience) return null;
    return { street: 'flop', cards, run: state.run, solution: state.run.snapshot(), nodes: treeOf(fs, state.spot), spot: state.spot, stack: config.stack, pot: config.pot, used: state.used };
  };
  const done = () => (state.settle && !Number.isNaN(state.settle.movement) ? along(0.35, state.settle.movement, state.lite.options.settle?.tolerance ?? 0.01) : 0);
  return { street: 'flop', step, done };
}

/** The two ranges as they arrive at the street that opens after `end` (a deal) of a solved street, on `cards`. */
export function arriving(parent, end, cards) {
  const child = parent.nodes[end].edges[0].child;
  const found = parent.spot.resolveBoard(cards);
  return [0, 1].map((p) => onBoard(parent.solution.reachAt(child, found.board, p), found, cards));
}

/** The street after `end` of a solved street, on `cards`, solved again for the ranges that arrive; `{ failed }` when one is empty. */
export function streetJob(config, parent, end, cards) {
  const street = streetOf(cards); const plan = PLAN[street];
  const state = { spent: 0, run: null, exploit: Infinity };
  const begin = () => {
    state.ranges = arriving(parent, end, cards);
    if (state.ranges.some((r) => mass(r) < ENOUGH)) return false;
    state.sub = parent.solution.subgameAt(parent.nodes[end].edges[0].child, parent.spot.resolveBoard(cards).board, {});
    state.spot = fs.defineSpot({ board: text(cards), pot: state.sub.pot, stack: state.sub.stack, oop: state.ranges[0], ip: state.ranges[1], ...bettingFor(config, cards.length) });
    state.run = fs.createRun(state.spot, {});
    return true;
  };
  const step = () => {
    if (!state.run && !begin()) return { failed: true };
    timed(state, () => { state.run.step(plan.chunk); state.exploit = state.run.exploitabilityPercent(); });
    if (state.exploit > plan.target && state.run.completed < 3000 && state.spent < plan.patience) return null;
    return { street, cards, run: state.run, solution: state.run.snapshot(), nodes: treeOf(fs, state.spot), spot: state.spot, stack: state.sub.stack, pot: state.sub.pot, oop: state.ranges[0], ip: state.ranges[1], exploit: state.exploit };
  };
  return { street, step, done: () => along(100, state.exploit, plan.target) };
}

/** The deals that end a solved street and lead on to another decision, likeliest first (how often both ranges get there, on `cards`). */
export function lineEnds(solved, cards) {
  const found = solved.spot.resolveBoard(cards); const out = [];
  for (const node of solved.nodes) {
    const child = solved.nodes[node.edges[0]?.child];
    if (node.kind !== 'chance' || node.round !== 0 || child?.kind !== 'decision') continue;
    const [oop, ip] = [0, 1].map((p) => mass(onBoard(solved.solution.reachAt(child.id, found.board, p), found, cards)));
    out.push({ id: node.id, oop, ip, weight: oop * ip });
  }
  return out.sort((a, b) => b.weight - a.weight);
}

/** A flop solved lite as Study takes it over: its average strategy (copied) and the betting it was solved with, where that
 *  was not the setup's; null when its storage is not the plain kind that can be copied across. */
export function exportedFlop(solved) {
  const sums = solved.run.solver.ctx.strategySum; if (!(sums instanceof Float32Array)) return null;
  return { board: text(solved.cards), pot: solved.pot, stack: solved.stack, lite: true, betting: solved.used ?? {}, exploit: null, sums: sums.slice() };
}

/** A solved street as Study takes it over: the spot as defined and its average strategy (copied), to send with its buffer. */
export function exported(solved) {
  const sums = solved.run.solver.ctx.strategySum.slice();
  return { board: text(solved.cards), pot: solved.pot, stack: solved.stack, oop: solved.oop, ip: solved.ip, exploit: solved.exploit, sums };
}
