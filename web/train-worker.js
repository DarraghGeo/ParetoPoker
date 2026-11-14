// Deals training spots: solves off the main thread and hands back the decisions to ask about.
// Every spot starts on a flop. A turn is a flop played down one of the lines its solution takes, a
// card dealt, and that street solved again for the ranges that arrive; a river, the same from a turn.
import * as fs from 'poker-flopsolve';
import { decisionAt, treeOf } from '../src/solver/flopsolve.js';

let job = 0;
// How finely the turn and river are solved (exploitability, % of the pot), for how long at most, and how
// many of its decisions one solve gives. Earlier streets cost more, so each solve is used for more spots.
// A flop is solved with the solver's lite preset, which stops when the first decisions stop moving.
const PLAN = {
  river: { target: 0.05, patience: 4000, chunk: 50, spots: 2 },
  turn: { target: 0.3, patience: 12000, chunk: 5, spots: 3 },
  flop: { patience: 90000, chunk: 5, spots: 5 },
};
/** How many turns are dealt off one flop, and rivers off one turn, before a new one is solved. */
const TURNS = 4; const RIVERS = 3;
/** A line is played down only when both ranges still hold this many combinations at the end of it. */
const ENOUGH = 8;
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
/** The flop solved last, kept whole: turns are dealt off it, and the next flop can start from it. `chain` counts the flops solved from one another in a row. */
let flop = null;
/** The turn solved last: rivers are dealt off it. */
let turn = null;
/** After this many flops each a card from the one before, a new flop is dealt and solved from nothing. */
const CHAIN = 2;
const pause = () => new Promise((resolve) => setTimeout(resolve));
const STREET = ['flop', 'turn', 'river'];
/** The betting a spot is solved with: one list of bet sizes plays on every street; several, the last ones are the later streets. */
function betting(c, cards) {
  const lists = Array.isArray(c.bets[0]) ? c.bets : [c.bets];
  const left = 6 - cards;
  const raises = c.raises.length ? c.maxRaises : 0;
  return { betSizes: lists.length > left ? lists.slice(-left) : lists, raiseSizes: raises ? c.raises.map((times) => ({ times })) : undefined, maxRaises: 1 + raises, allowAllIn: !!c.allIn };
}

/** Solve a flop, lite: its betting as given, one size on the turn and river, river storage shared, deals sampled. Null when a newer request took over. */
async function solveFlop(c, setup, live, say) {
  // A flop can start from the flop solved before it when the two are a card apart: about half the iterations of one from nothing
  const from = flop && flop.setup === setup && flop.chain < CHAIN ? flop : null;
  const near = from ? nearby(from.cards) : null;
  const cards = near ?? dealBoard(3);
  const board = fs.parseCards(cards.join(' '));
  const warmCards = near ? onto(board, fs.parseCards(from.cards.join(' '))) : null;
  const lite = fs.litePreset({ board: cards.join(' '), pot: c.pot, stack: c.stack, oop: c.oop, ip: c.ip, ...betting(c, 3) });
  const spot = fs.defineSpot(lite.config);
  const run = fs.createRun(spot, { ...lite.options, ...(warmCards ? { warmStart: from.run, warmCards } : {}) });
  const started = Date.now(); const plan = PLAN.flop;
  say('flop', 0); await pause();
  const every = lite.options.settle?.every ?? 20; const still = lite.options.settle?.tolerance ?? 0.01;
  const settle = fs.trackSettle(lite.options.settle || {});
  let settled = false;
  while (live() && !settled && run.completed < lite.options.iterations && Date.now() - started < plan.patience) {
    run.step(plan.chunk);
    if (run.completed % every === 0) settled = settle.check(run.snapshot(), run.completed);
    say('flop', Number.isNaN(settle.movement) ? 0 : along(0.35, settle.movement, still));
    await pause();
  }
  if (!live()) return null;
  return { street: 'flop', cards, board, run, solution: run.snapshot(), nodes: treeOf(fs, spot), spot, stack: c.stack, history: [], setup, chain: warmCards ? from.chain + 1 : 0, near: !!warmCards, left: TURNS };
}

/**
 * The next street off a solved one: a line its solution takes to the end of the street, picked by
 * how often it is taken, a card dealt, and the street that opens there solved for the two ranges
 * as they arrive, with the setup's own betting. Null when a newer request took over.
 */
async function solveNext(parent, c, live, say) {
  const { solution, nodes, spot } = parent;
  const street = STREET[parent.cards.length - 2]; const plan = PLAN[street];
  // the ends of the parent's street that lead on to a deal
  const ends = nodes.filter((n) => n.kind === 'chance' && n.round === 0 && nodes[n.edges[0]?.child]?.kind === 'decision');
  const deck = []; for (const r of RANKS) for (const s of SUITS) if (!parent.cards.includes(r + s)) deck.push(r + s);
  let pick = null;
  for (let tries = 0; tries < 8 && !pick; tries++) {
    const card = deck[Math.floor(Math.random() * deck.length)];
    const board = [...parent.board, fs.parseCard(card)];
    const found = spot.resolveBoard(board); const taken = new Set(board);
    // a stored range read as the real one on this board
    const real = (stored) => { const out = new Array(fs.COMBOS).fill(0); for (let k = 0; k < fs.COMBOS; k++) if (!taken.has(fs.COMBO_CARDS[2 * k]) && !taken.has(fs.COMBO_CARDS[2 * k + 1])) out[k] = stored[found.combos[k]]; return out; };
    const mass = (list) => list.reduce((t, w) => t + w, 0);
    const lines = [];
    for (const end of ends) {
      const child = end.edges[0].child;
      const oop = real(solution.reachAt(child, found.board, 0)); const ip = real(solution.reachAt(child, found.board, 1));
      const held = [mass(oop), mass(ip)];
      if (held[0] >= ENOUGH && held[1] >= ENOUGH) lines.push({ end, child, oop, ip, weight: held[0] * held[1], found, card, board });
    }
    if (!lines.length) continue;
    let roll = Math.random() * lines.reduce((t, l) => t + l.weight, 0);
    pick = lines.find((l) => (roll -= l.weight) <= 0) ?? lines[lines.length - 1];
  }
  if (!pick) throw new Error('No line of play leaves both ranges enough hands.');
  // the actions that ended the street, each with who took it
  const actions = []; let at = pick.end.id;
  while (nodes[at].parent >= 0) { const before = nodes[nodes[at].parent]; if (before.kind === 'decision') actions.unshift({ seat: before.seat, label: before.edges[nodes[at].via].label }); at = before.id; }
  const sub = solution.subgameAt(pick.child, pick.found.board, {});
  const cards = [...parent.cards, pick.card];
  const next = fs.defineSpot({ board: cards.join(' '), pot: sub.pot, stack: sub.stack, oop: pick.oop, ip: pick.ip, ...betting(c, cards.length) });
  const run = fs.createRun(next, {});
  const started = Date.now(); let exploit = Infinity;
  say(street, 0); await pause();
  while (live() && exploit > plan.target && run.completed < 3000 && Date.now() - started < plan.patience) {
    run.step(plan.chunk);
    exploit = run.exploitabilityPercent();
    say(street, along(100, exploit, plan.target));
    await pause();
  }
  if (!live()) return null;
  if (!run.completed) run.step(1);
  const history = [...parent.history, { street: parent.street, cards: parent.street === 'flop' ? parent.cards : [parent.cards[parent.cards.length - 1]], actions }];
  return { street, cards, board: pick.board, solution: run.snapshot(), nodes: treeOf(fs, next), spot: next, stack: sub.stack, history, left: RIVERS };
}

/** The decisions on a solved street worth asking about: first to act, checked to, facing a bet, facing a bet after checking. */
function positions(solved) {
  const { solution, nodes } = solved;
  const open = [];
  const reach = (id, depth) => {
    const node = nodes[id];
    if (node.kind !== 'decision' || node.round !== 0) return;
    open.push({ id, weight: depth === 0 || !node.invested.some((x) => x > 0) ? 3 : 1 });
    if (depth < 2) for (const edge of node.edges) if (edge.kind !== 'fold' && edge.kind !== 'call') reach(edge.child, depth + 1);
  };
  reach(0, 0);
  const decisions = [];
  while (open.length && decisions.length < PLAN[solved.street].spots) {
    let roll = Math.random() * open.reduce((t, o) => t + o.weight, 0);
    let k = 0; while (k < open.length - 1 && (roll -= open[k].weight) > 0) k++;
    const [{ id }] = open.splice(k, 1);
    const d = decisionAt(fs, solution, nodes, id, []);
    if (!d) continue;
    // a line the solution never takes leaves no range to ask about
    const held = (list) => list.reduce((t, h) => t + h.weight, 0);
    if (held(d.hands) < 6 || held(d.villain) < 6) continue;
    const line = []; let at = id;
    while (nodes[at].parent >= 0) { const parent = nodes[nodes[at].parent]; line.unshift(parent.edges[nodes[at].via].label); at = parent.id; }
    const me = d.seat === 'oop' ? 0 : 1;
    // `history`: the streets before this one, each with its cards and the actions that ended it
    decisions.push({ ...d, line, behind: solved.stack - nodes[id].invested[me], history: solved.history, flop: solved.cards.slice(0, 3) });
  }
  return decisions;
}

self.onmessage = async ({ data }) => {
  if (data.type !== 'deal') return;
  const mine = ++job; const live = () => mine === job;
  try {
    const c = data.config; const street = data.street;
    const setup = JSON.stringify(c);
    const say = (now, done) => self.postMessage({ type: 'progress', id: data.id, street: now, done });
    if (flop && flop.setup !== setup) { flop = null; turn = null; }
    let solved = null;
    if (street === 'flop' || !flop || (flop.left <= 0 && (street === 'turn' || !turn || turn.left <= 0))) {
      // a new flop: every spot starts from one
      const fresh = await solveFlop(c, setup, live, say); if (!fresh) return;
      flop = fresh; turn = null; solved = flop;
    }
    if (street !== 'flop') {
      if (street === 'turn' || !turn || turn.left <= 0) {
        const fresh = await solveNext(flop, c, live, say); if (!fresh) return;
        flop.left--; turn = fresh;
      }
      solved = turn;
      if (street === 'river') { solved = await solveNext(turn, c, live, say); if (!solved) return; turn.left--; }
    }
    self.postMessage({ type: 'dealt', id: data.id, street, near: street === 'flop' && flop.near, decisions: positions(solved) });
  } catch (error) {
    self.postMessage({ type: 'error', id: data.id, message: String(error?.message ?? error).split('\n')[0] });
  }
};
