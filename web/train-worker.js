// Deals training spots: solves a board off the main thread and hands back the decisions to ask about.
import * as fs from 'poker-flopsolve';
import { decisionAt, treeOf } from '../src/solver/flopsolve.js';

let job = 0;
// How finely the turn and river are solved (exploitability, % of the pot), for how long at most, and how
// many of its decisions one solve gives. Earlier streets cost more, so each solve is used for more spots.
// A flop is solved with the solver's lite preset, which stops when the first decisions stop moving.
const PLAN = {
  river: { target: 0.05, patience: 4000, chunk: 50, spots: 1 },
  turn: { target: 0.4, patience: 12000, chunk: 5, spots: 2 },
  flop: { patience: 90000, chunk: 5, spots: 3 },
};
/** How far along a figure that closes in on its target by ratio is, 0 to 1. */
const along = (from, now, to) => (now < Infinity ? Math.min(1, Math.max(0, Math.log(from / now) / Math.log(from / to))) : 0);
const pause = () => new Promise((resolve) => setTimeout(resolve));

self.onmessage = async ({ data }) => {
  if (data.type !== 'deal') return;
  const mine = ++job;
  try {
    const c = data.config;
    const board = fs.parseCards(c.board);
    const street = ['flop', 'turn', 'river'][board.length - 3];
    const plan = PLAN[street];
    // One list of bet sizes plays on every street; several, the last ones are the later streets
    const lists = Array.isArray(c.bets[0]) ? c.bets : [c.bets];
    const left = 6 - board.length;
    const betSizes = lists.length > left ? lists.slice(-left) : lists;
    const raises = c.raises.length ? c.maxRaises : 0;
    const given = { board: c.board, pot: c.pot, stack: c.stack, oop: c.oop, ip: c.ip, betSizes, raiseSizes: raises ? c.raises.map((times) => ({ times })) : undefined, maxRaises: 1 + raises, allowAllIn: !!c.allIn };
    // Lite: the flop's betting as given, one size on the turn and river, river storage shared, deals sampled
    const lite = street === 'flop' ? fs.litePreset(given) : null;
    const spot = fs.defineSpot(lite ? lite.config : given);
    const run = fs.createRun(spot, lite ? lite.options : {});
    const started = Date.now();
    const say = (done) => self.postMessage({ type: 'progress', id: data.id, street, done });
    say(0);
    await pause();
    if (lite) {
      const every = lite.options.settle?.every ?? 20; const still = lite.options.settle?.tolerance ?? 0.01;
      const settle = fs.trackSettle(lite.options.settle || {});
      let settled = false;
      while (mine === job && !settled && run.completed < lite.options.iterations && Date.now() - started < plan.patience) {
        run.step(plan.chunk);
        if (run.completed % every === 0) settled = settle.check(run.snapshot(), run.completed);
        say(Number.isNaN(settle.movement) ? 0 : along(0.35, settle.movement, still));
        await pause();
      }
    } else {
      let exploit = Infinity;
      while (mine === job && exploit > plan.target && run.completed < 3000 && Date.now() - started < plan.patience) {
        run.step(plan.chunk);
        exploit = run.exploitabilityPercent();
        say(along(100, exploit, plan.target));
        await pause();
      }
    }
    if (mine !== job) return;
    if (!run.completed) run.step(1);
    const solution = run.snapshot();
    const nodes = treeOf(fs, spot);
    // The decisions on this street worth asking about: first to act, checked to, facing a bet, facing a bet after checking
    const open = [];
    const reach = (id, depth) => {
      const node = nodes[id];
      if (node.kind !== 'decision' || node.round !== 0) return;
      open.push({ id, weight: depth === 0 || !node.invested.some((x) => x > 0) ? 3 : 1 });
      if (depth < 2) for (const edge of node.edges) if (edge.kind !== 'fold' && edge.kind !== 'call') reach(edge.child, depth + 1);
    };
    reach(0, 0);
    const decisions = [];
    while (open.length && decisions.length < plan.spots) {
      let roll = Math.random() * open.reduce((t, o) => t + o.weight, 0);
      let k = 0; while (k < open.length - 1 && (roll -= open[k].weight) > 0) k++;
      const [{ id }] = open.splice(k, 1);
      const d = decisionAt(fs, solution, nodes, id, []);
      if (!d) continue;
      // a line the solution never takes leaves no range to ask about
      const held = (list) => list.reduce((t, h) => t + h.weight, 0);
      if (held(d.hands) < 4 || held(d.villain) < 4) continue;
      const line = []; let at = id;
      while (nodes[at].parent >= 0) { const parent = nodes[nodes[at].parent]; line.unshift(parent.edges[nodes[at].via].label); at = parent.id; }
      const me = d.seat === 'oop' ? 0 : 1;
      decisions.push({ ...d, line, behind: c.stack - nodes[id].invested[me] });
    }
    self.postMessage({ type: 'dealt', id: data.id, street, decisions });
  } catch (error) {
    self.postMessage({ type: 'error', id: data.id, message: String(error?.message ?? error).split('\n')[0] });
  }
};
