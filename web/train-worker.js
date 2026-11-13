// Deals training spots: solves a board off the main thread and hands back the decisions to ask about.
import * as fs from 'poker-flopsolve';
import { decisionAt, treeOf } from '../src/solver/flopsolve.js';

let job = 0;
// How finely the turn and river are solved (exploitability, % of the pot), for how long at most, and how
// many of its decisions one solve gives. Earlier streets cost more, so each solve is used for more spots.
// A flop is solved with the solver's lite preset, which stops when the first decisions stop moving.
const PLAN = {
  river: { target: 0.05, patience: 4000, chunk: 50, spots: 1 },
  turn: { target: 0.4, patience: 12000, chunk: 5, spots: 3 },
  flop: { patience: 90000, chunk: 5, spots: 5 },
};
/** How far along a figure that closes in on its target by ratio is, 0 to 1. */
const along = (from, now, to) => (now < Infinity ? Math.min(1, Math.max(0, Math.log(from / now) / Math.log(from / to))) : 0);
const RANKS = '23456789TJQKA'; const SUITS = 'shdc';
function dealBoard(n) {
  const deck = []; for (const r of RANKS) for (const s of SUITS) deck.push(r + s);
  const out = []; while (out.length < n) out.push(deck.splice(Math.floor(Math.random() * deck.length), 1)[0]);
  return out;
}
/** A flop one card away from another: one of its cards a rank higher or lower, to a rank the flop does not hold. Null when no card can move. */
function nearby(cards) {
  const held = new Set(cards.map((c) => c[0]));
  const moves = [];
  cards.forEach((card, k) => {
    // a paired card moved on its own would make another kind of flop
    if (cards.filter((c) => c[0] === card[0]).length > 1) return;
    for (const step of [-1, 1]) { const rank = RANKS[RANKS.indexOf(card[0]) + step]; if (rank && !held.has(rank)) moves.push(cards.map((c, i) => (i === k ? rank + card[1] : c))); }
  });
  return moves.length ? moves[Math.floor(Math.random() * moves.length)] : null;
}
/**
 * The relabelling of the deck that takes one board onto another, for a warm start: rank to rank and
 * suit to suit, the ranks off the board keeping their order. Null when the two boards are not the
 * same kind (a pair against none, another suit pattern).
 */
function onto(board, old) {
  const rank = new Array(13).fill(-1); const suit = new Array(4).fill(-1); const ranks = new Set(); const suits = new Set();
  for (let i = 0; i < board.length; i++) {
    const a = fs.rankOf(board[i]); const b = fs.rankOf(old[i]); const x = fs.suitOf(board[i]); const y = fs.suitOf(old[i]);
    if (rank[a] >= 0 ? rank[a] !== b : ranks.has(b)) return null;
    if (suit[x] >= 0 ? suit[x] !== y : suits.has(y)) return null;
    rank[a] = b; ranks.add(b); suit[x] = y; suits.add(y);
  }
  const fill = (map, taken) => { const free = map.map((_, k) => k).filter((k) => !taken.has(k)); let k = 0; for (let i = 0; i < map.length; i++) if (map[i] < 0) map[i] = free[k++]; };
  fill(rank, ranks); fill(suit, suits);
  const map = new Uint8Array(52);
  for (let c = 0; c < 52; c++) map[c] = fs.cardOf(rank[fs.rankOf(c)], suit[fs.suitOf(c)]);
  return map;
}
/** The flop solved last, kept whole: the next flop can start from it. `chain` counts the flops solved from one another in a row. */
let last = null;
/** After this many flops each a card from the one before, a new flop is dealt and solved from nothing. */
const CHAIN = 2;
const pause = () => new Promise((resolve) => setTimeout(resolve));

self.onmessage = async ({ data }) => {
  if (data.type !== 'deal') return;
  const mine = ++job;
  try {
    const c = data.config; const street = data.street;
    const plan = PLAN[street];
    const setup = JSON.stringify(c);
    // A flop can start from the flop solved before it when the two are a card apart: about a third of the time of one from nothing
    const from = street === 'flop' && last && last.setup === setup && last.chain < CHAIN ? last : null;
    const near = from ? nearby(from.cards) : null;
    const cards = near ?? dealBoard({ flop: 3, turn: 4, river: 5 }[street]);
    const board = fs.parseCards(cards.join(' '));
    const warmCards = near ? onto(board, fs.parseCards(from.cards.join(' '))) : null;
    // One list of bet sizes plays on every street; several, the last ones are the later streets
    const lists = Array.isArray(c.bets[0]) ? c.bets : [c.bets];
    const left = 6 - board.length;
    const betSizes = lists.length > left ? lists.slice(-left) : lists;
    const raises = c.raises.length ? c.maxRaises : 0;
    const given = { board: cards.join(' '), pot: c.pot, stack: c.stack, oop: c.oop, ip: c.ip, betSizes, raiseSizes: raises ? c.raises.map((times) => ({ times })) : undefined, maxRaises: 1 + raises, allowAllIn: !!c.allIn };
    // Lite: the flop's betting as given, one size on the turn and river, river storage shared, deals sampled
    const lite = street === 'flop' ? fs.litePreset(given) : null;
    const spot = fs.defineSpot(lite ? lite.config : given);
    const run = fs.createRun(spot, lite ? { ...lite.options, ...(warmCards ? { warmStart: from.run, warmCards } : {}) } : {});
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
    if (street === 'flop') last = { cards, run, setup, chain: warmCards ? from.chain + 1 : 0 };
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
    self.postMessage({ type: 'dealt', id: data.id, street, near: !!warmCards, decisions });
  } catch (error) {
    self.postMessage({ type: 'error', id: data.id, message: String(error?.message ?? error).split('\n')[0] });
  }
};
