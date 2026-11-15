// Play: full hands against the solved villain, off the main thread. A hand is dealt whole at the start (both hands
// and the five board cards); its flop is solved lite with the setup's ranges, and each later street is solved again
// for the two ranges as they arrive down the line played, with the setup's own betting (as Train and Study do).
// Villain plays his solved strategy for the hand he holds. Solving runs ahead of play: while a street is played,
// the next street is solved for every way this one can end (the likeliest first), and the next hands' flops are
// solved behind that, so a street is usually ready by the time it is reached.
import * as fs from 'poker-flopsolve';
import { treeOf } from '../src/solver/flopsolve.js';

// How finely each street is solved (exploitability, % of the pot) and for how long at most; a flop is solved lite
// and stops when its first decisions stop moving (as Train)
const PLAN = { flop: { patience: 90000, chunk: 5 }, turn: { target: 0.3, patience: 12000, chunk: 5 }, river: { target: 0.05, patience: 4000, chunk: 50 } };
/** Hands kept solved ahead of the one being played. */
const AHEAD = 2;
/** A street is solved again only when both ranges arriving hold at least this many combinations. */
const ENOUGH = 1;
const STREET = ['flop', 'turn', 'river'];
const pause = () => new Promise((resolve) => setTimeout(resolve));
const cardsOf = (combo) => [fs.COMBO_CARDS[2 * combo], fs.COMBO_CARDS[2 * combo + 1]];
const text = (cards) => cards.map((c) => fs.formatCard(c)).join(' ');

let config = null;
let handId = 0;
const hands = []; // [0] is being played (once started), the rest wait
let playing = null; // the hand on screen, with where its play stands
const current = () => playing?.hand ?? null;
const jobs = new Map(); // solves under way, by key
let pumping = false;

/** The betting a street is solved with: one list of bet sizes plays on every street; several, the last ones are the later streets. */
function betting(c, cards) {
  const lists = Array.isArray(c.bets[0]) ? c.bets : [c.bets];
  const left = 6 - cards; const raises = c.raises.length ? c.maxRaises : 0;
  return { betSizes: lists.length > left ? lists.slice(-left) : lists, raiseSizes: raises ? c.raises.map((times) => ({ times })) : undefined, maxRaises: 1 + raises, allowAllIn: !!c.allIn };
}

/** One combination drawn by weight from a range, leaving out the cards already dealt. */
function draw(weights, dead) {
  let total = 0;
  for (let c = 0; c < fs.COMBOS; c++) { const [a, b] = cardsOf(c); if (!dead.has(a) && !dead.has(b)) total += weights[c]; }
  let roll = Math.random() * total;
  for (let c = 0; c < fs.COMBOS; c++) { const [a, b] = cardsOf(c); if (dead.has(a) || dead.has(b)) continue; roll -= weights[c]; if (roll <= 0 && weights[c] > 0) return c; }
  return -1;
}

/** A new hand: hero's seat, both hands drawn from the setup's ranges, then the five board cards from what is left. */
function deal() {
  const seat = Math.random() < 0.5 ? 'oop' : 'ip';
  const ranges = { oop: fs.parseRange(config.oop), ip: fs.parseRange(config.ip) };
  const dead = new Set();
  const hero = draw(ranges[seat], dead); cardsOf(hero).forEach((c) => dead.add(c));
  const villain = draw(ranges[seat === 'oop' ? 'ip' : 'oop'], dead); cardsOf(villain).forEach((c) => dead.add(c));
  const deck = []; for (let c = 0; c < 52; c++) if (!dead.has(c)) deck.push(c);
  const board = []; while (board.length < 5) board.push(deck.splice(Math.floor(Math.random() * deck.length), 1)[0]);
  return { id: ++handId, seat, hero, villain, board, flop: null, next: new Map(), failed: null };
}

// ---- solves, each a job stepped a chunk at a time, the most needed first ----

/** The flop, solved lite. */
function flopJob(hand) {
  let run = null, spot = null, lite = null, settle = null, spent = 0, settled = false;
  return {
    key: `flop|${hand.id}`, hand, street: 'flop',
    step() {
      if (!run) {
        lite = fs.litePreset({ board: text(hand.board.slice(0, 3)), pot: config.pot, stack: config.stack, oop: config.oop, ip: config.ip, ...betting(config, 3) });
        spot = fs.defineSpot(lite.config); run = fs.createRun(spot, lite.options); settle = fs.trackSettle(lite.options.settle || {});
      }
      const t = Date.now(); run.step(PLAN.flop.chunk); spent += Date.now() - t;
      if (run.completed % (lite.options.settle?.every ?? 20) === 0) settled = settle.check(run.snapshot(), run.completed);
      if (!(settled || run.completed >= lite.options.iterations || spent >= PLAN.flop.patience)) return null;
      return { street: 'flop', solution: run.snapshot(), nodes: treeOf(fs, spot), spot, stack: config.stack, board: hand.board.slice(0, 3), exploit: null };
    },
  };
}

/** The street that opens after `end` (a deal) in a solved street, solved again for the ranges that arrive there. */
function nextJob(hand, parent, end) {
  const cards = hand.board.slice(0, parent.board.length + 1); const street = STREET[cards.length - 3]; const plan = PLAN[street];
  let run = null, spot = null, sub = null, spent = 0, exploit = Infinity, ranges = null;
  const parentKey = parent.key ?? 'flop';
  return {
    key: `${street}|${hand.id}|${parentKey}|${end}`, hand, street, slot: `${parentKey}|${end}`,
    step() {
      if (!run) {
        const child = parent.nodes[end].edges[0].child;
        const found = parent.spot.resolveBoard(cards); const taken = new Set(cards);
        const real = (stored) => { const out = new Array(fs.COMBOS).fill(0); for (let k = 0; k < fs.COMBOS; k++) if (!taken.has(fs.COMBO_CARDS[2 * k]) && !taken.has(fs.COMBO_CARDS[2 * k + 1])) out[k] = stored[found.combos[k]]; return out; };
        ranges = [real(parent.solution.reachAt(child, found.board, 0)), real(parent.solution.reachAt(child, found.board, 1))];
        const mass = (list) => list.reduce((t, w) => t + w, 0);
        // a line no hand of a range plays leaves nothing to solve for: the street is played on in the solve before it
        if (mass(ranges[0]) < ENOUGH || mass(ranges[1]) < ENOUGH) return { failed: true };
        sub = parent.solution.subgameAt(child, found.board, {});
        spot = fs.defineSpot({ board: text(cards), pot: sub.pot, stack: sub.stack, oop: ranges[0], ip: ranges[1], ...betting(config, cards.length) });
        run = fs.createRun(spot, {});
      }
      const t = Date.now(); run.step(plan.chunk); exploit = run.exploitabilityPercent(); spent += Date.now() - t;
      if (exploit > plan.target && run.completed < 3000 && spent < plan.patience) return null;
      return { street, solution: run.snapshot(), nodes: treeOf(fs, spot), spot, run, stack: sub.stack, board: cards, exploit, oop: ranges[0], ip: ranges[1], pot: sub.pot, key: `${street}@${parentKey}@${end}` };
    },
  };
}

/** The deals that end a solved street and lead on to another decision, with how often the two ranges get there. */
function ends(solved, board) {
  const out = [];
  const found = solved.spot.resolveBoard(board);
  for (const n of solved.nodes) {
    if (n.kind !== 'chance' || n.round !== 0 || solved.nodes[n.edges[0]?.child]?.kind !== 'decision') continue;
    const child = n.edges[0].child; const mass = (p) => solved.solution.reachAt(child, found.board, p).reduce((t, w) => t + w, 0);
    out.push({ id: n.id, weight: mass(0) * mass(1) });
  }
  return out.sort((a, b) => b.weight - a.weight);
}

/** Every solve wanted now, the most needed first: the street the hand on screen waits for, the rest of its next street, then the hands ahead. */
function wanted() {
  const list = [];
  const want = (job, rank) => { if (!jobs.has(job.key)) jobs.set(job.key, job); list.push([rank, jobs.get(job.key)]); };
  hands.forEach((hand, k) => {
    if (hand === current() && playing.done) return;
    if (!hand.flop) { want(flopJob(hand), k === 0 ? 90 : 60 - 10 * k); return; }
    // the next street off the street being played (or off the flop, for a hand still waiting), every way it can end
    const at = hand === current() ? playing.seg : null;
    const base = at ? at.solved : hand.flop;
    if (base.board.length >= 5) return;
    const cut = base.board.length + 1; const board = hand.board.slice(0, cut);
    base.ends ??= ends(base, board);
    base.ends.forEach((e, i) => {
      if (hand.next.has(`${base.key ?? 'flop'}|${e.id}`)) return;
      if (hand !== current() && i >= 3) return;
      const rank = hand === current() ? (playing.waiting === e.id ? 100 : 80 - i) : 40 - 10 * k - i;
      want(nextJob(hand, base, e.id), rank);
    });
  });
  return list.sort((a, b) => b[0] - a[0]).map(([, job]) => job);
}

/** Step the most needed solve, again and again, until nothing is wanted. */
async function pump() {
  if (pumping) return; pumping = true;
  try {
    for (;;) {
      while (hands.length < AHEAD + (current() ? 1 : 0)) hands.push(deal());
      const job = wanted()[0];
      if (!job) break;
      let result;
      try { result = job.step(); } catch (error) { result = { failed: true, error: String(error?.message ?? error) }; }
      if (result) {
        jobs.delete(job.key);
        if (job.street === 'flop') {
          if (result.failed) { job.hand.failed = result.error ?? 'This setup cannot be solved.'; hands.splice(hands.indexOf(job.hand), 1); if (hands.length === 0 || job.hand === current()) say({ type: 'error', message: job.hand.failed }); }
          else job.hand.flop = result;
        } else job.hand.next.set(job.slot, result);
        status();
        if (job.hand === current()) proceed();
        else if (!current() && hands.some((h) => h.flop)) say({ type: 'ready' });
      }
      await pause();
    }
  } finally { pumping = false; }
}

// ---- the hand being played ----

const say = (msg) => self.postMessage(msg);
function status() {
  const ready = hands.filter((h) => h !== current() && h.flop).length;
  const busy = wanted()[0];
  say({ type: 'status', ready, solving: busy ? `${busy.street}${busy.hand === current() ? '' : ' ahead'}` : '' });
}

/** Start the next hand: its flop must be solved. */
function start() {
  const done = current();
  if (done) { const k = hands.indexOf(done); if (k >= 0) hands.splice(k, 1); for (const key of [...jobs.keys()]) if (jobs.get(key).hand === done) jobs.delete(key); }
  playing = null;
  const hand = hands.find((h) => h.flop);
  if (!hand) { status(); pump(); say({ type: 'waiting' }); return; }
  hands.splice(hands.indexOf(hand), 1); hands.unshift(hand);
  const me = hand.seat === 'oop' ? 0 : 1;
  playing = { hand, me, seg: { solved: { ...hand.flop, key: 'flop' }, node: 0, dealt: [] }, history: [{ street: 'flop', actions: [] }], put: [0, 0], pot0: config.pot, waiting: null, done: null };
  proceed(); pump();
}

/** His strategy at a decision, for the hand he holds: one action drawn by its frequency. */
function villainAct(seg, node) {
  const { solution, spot } = seg.solved;
  const found = spot.resolveBoard([...spot.board, ...seg.dealt.slice(0, node.round)]);
  const view = solution.strategyAt(node.id, found.board); const n = view.actions.length;
  const i = view.combos.indexOf(found.combos[playing.hand.villain]);
  if (i < 0) return node.edges.findIndex((e) => e.kind === 'check' || e.kind === 'call');
  let roll = Math.random(); for (let a = 0; a < n; a++) { roll -= view.probs[i * n + a]; if (roll <= 0) return a; }
  return n - 1;
}

/** Take an action at the decision on screen. */
function take(seg, node, k) {
  const edge = node.edges[k]; const who = node.seat === 'oop' ? 0 : 1;
  if (edge.kind !== 'fold' && edge.kind !== 'check') playing.put[who] += edge.to - node.invested[who];
  playing.history[playing.history.length - 1].actions.push({ who: who === playing.me ? 'hero' : 'villain', label: edge.label, kind: edge.kind });
  if (edge.kind === 'fold') { playing.done = { folded: who === playing.me ? 'hero' : 'villain' }; return; }
  seg.node = edge.child;
}

/** Play on from where the hand stands: villain's decisions, the deals, until hero is to act or the hand is over. */
function proceed() {
  const p = playing; if (!p) return;
  if (p.done) { post(); status(); pump(); return; }
  for (let guard = 0; guard < 64 && !p.done; guard++) {
    const seg = p.seg; const node = seg.solved.nodes[seg.node];
    if (node.kind === 'decision') {
      if ((node.seat === 'oop' ? 0 : 1) === p.me) { p.waiting = null; post(); return; }
      take(seg, node, villainAct(seg, node)); continue;
    }
    if (node.kind === 'showdown') { p.done = { showdown: true }; break; }
    if (node.kind === 'fold') { break; }
    if (node.kind === 'chance') {
      // the street is over: the next card, and the next street solved again for the ranges that arrive (or, where it
      // could not be, played on in this solve)
      const key = `${seg.solved.key}|${seg.node}`; const next = p.hand.next.get(key);
      const card = p.hand.board[seg.solved.board.length + seg.dealt.length];
      // all in: no more decisions, the cards are dealt to the showdown in this solve
      const allIn = seg.solved.nodes[node.edges[0].child]?.kind !== 'decision';
      if (next === undefined && seg.dealt.length === 0 && !allIn) { p.waiting = seg.node; post(); pump(); return; }
      p.history.push({ street: STREET[seg.solved.board.length + seg.dealt.length - 2], actions: [] });
      if (next && !next.failed && !allIn) p.seg = { solved: next, node: 0, dealt: [] };
      else { seg.dealt.push(card); seg.node = node.edges[0].child; }
      continue;
    }
  }
  post(); status(); pump();
}

/** What the page shows: the hand as it stands, hero's choices if it is his turn, both ranges, and the result at the end. */
function post() {
  const p = playing; const seg = p.seg; const node = seg.solved.nodes[seg.node]; const board = [...seg.solved.board, ...seg.dealt];
  const { solution, spot } = seg.solved; const found = spot.resolveBoard(board);
  const here = node.kind === 'decision' ? node : null;
  const range = (who) => {
    if (!here) return null;
    const stored = solution.reachAt(here.id, found.board, who); const taken = new Set(board); const out = [];
    for (let c = 0; c < fs.COMBOS; c++) { const [a, b] = cardsOf(c); if (taken.has(a) || taken.has(b)) continue; const w = stored[found.combos[c]]; if (w > 1e-6) out.push([fs.formatCombo(c), Math.round(w * 1e4) / 1e4]); }
    return out;
  };
  const toAct = here && (here.seat === 'oop' ? 0 : 1) === p.me;
  const pot = p.pot0 + p.put[0] + p.put[1];
  const behind = (who) => config.stack - p.put[who];
  let result = null;
  if (p.done) {
    const won = (who) => (who === p.me ? p.pot0 + p.put[1 - p.me] : -p.put[p.me]);
    if (p.done.folded) result = { how: `${p.done.folded === 'hero' ? 'You' : 'Villain'} folded`, net: won(p.done.folded === 'hero' ? 1 - p.me : p.me) };
    else {
      const full = p.hand.board; const mine = fs.evaluateCards([...full, ...cardsOf(p.hand.hero)]); const his = fs.evaluateCards([...full, ...cardsOf(p.hand.villain)]);
      const name = (v) => fs.CATEGORY_NAMES[fs.categoryOf(v)];
      result = { how: mine > his ? 'You win at showdown' : mine < his ? 'Villain wins at showdown' : 'Split pot', net: mine > his ? won(p.me) : mine < his ? won(1 - p.me) : (p.pot0 + p.put[1 - p.me] - p.put[p.me]) / 2, mine: name(mine), his: name(his) };
    }
    result.net = Math.round(result.net * 100) / 100;
  }
  // Study opens on this spot: its line from the flop, the cards dealt, and (for a street solved again here) the solve to hand over
  const line = []; let at = seg.node; const nodes = seg.solved.nodes;
  while (nodes[at].parent >= 0) { const parent = nodes[nodes[at].parent]; if (parent.kind === 'decision') line.unshift(parent.edges[nodes[at].via].label); at = parent.id; }
  const before = p.history.slice(0, -1).flatMap((h) => h.actions.map((a) => a.label));
  say({
    type: 'state', id: p.hand.id, seat: p.hand.seat, hero: fs.formatCombo(p.hand.hero), villain: p.done && !p.done.folded ? fs.formatCombo(p.hand.villain) : null,
    board: text(p.done && !p.done.folded ? p.hand.board : board), pot: Math.round(pot * 100) / 100, behind: [behind(0), behind(1)].map((x) => Math.round(x * 100) / 100), history: p.history,
    toAct, waiting: p.waiting != null, actions: toAct ? here.edges.map((e) => ({ label: e.label, kind: e.kind, add: Math.round((e.to - here.invested[p.me]) * 100) / 100 })) : [],
    ranges: here ? { oop: range(0), ip: range(1) } : null, actor: here?.seat ?? null, result,
    study: here ? { flop: text(p.hand.board.slice(0, 3)), line: seg.solved.key === 'flop' ? line : [...before, ...line], streetLine: line, dealt: board.slice(3).map((c) => fs.formatCard(c)), share: seg.solved.run ? `${p.hand.id}|${seg.solved.key}` : null } : null,
  });
}

self.onmessage = ({ data }) => {
  if (data.type === 'setup') { config = data.config; hands.length = 0; jobs.clear(); playing = null; pump(); status(); return; }
  if (data.type === 'deal') { start(); return; }
  if (data.type === 'act' && playing && !playing.done) {
    const seg = playing.seg; const node = seg.solved.nodes[seg.node];
    if (node.kind !== 'decision' || (node.seat === 'oop' ? 0 : 1) !== playing.me) return;
    const k = node.edges.findIndex((e) => e.label === data.label); if (k < 0) return;
    take(seg, node, k); proceed(); return;
  }
  if (data.type === 'export') {
    // the street on screen, for Study: the spot as it was defined and its average strategy (as Train's worker)
    const [id, ...rest] = String(data.solve).split('|'); const key = rest.join('|');
    const seg = playing && String(playing.hand.id) === id && playing.seg.solved.key === key ? playing.seg.solved : null;
    if (!seg?.run) { say({ type: 'export', ask: data.ask, found: false }); return; }
    const sums = seg.run.solver.ctx.strategySum.slice();
    say({ type: 'export', ask: data.ask, found: true, board: text(seg.board), pot: seg.pot, stack: seg.stack, oop: seg.oop, ip: seg.ip, exploit: seg.exploit, sums }, [sums.buffer]);
  }
};
