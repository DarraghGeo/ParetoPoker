// Solving ahead of play. The flops of the hands ahead are solved by the page's flop workers, beside this one: each hand
// dealt here is asked for there, and comes back as numbers read into a solve (`gotFlop`). Here are solved the later
// streets, the most needed first (the street the hand on screen waits for, the rest of its next street, then the likeliest
// turns of the hands ahead), stepped one chunk at a time.
import { lineEnds, streetJob } from '../../solver/jobs.js';
import { keptNote, sigOf } from '../../solver/kept.js';
import { pause } from '../../solver/progress.js';
import { dealHand } from './deal.js';
import { current, play, say, slot } from './state.js';

/** A setup whose flops fail this many times running is given up on. */
const FAILS = 3;
/** Hands kept solved ahead of the one being played. */
const AHEAD = 3;
/** Turns solved for a hand still waiting: its likeliest lines. */
const WAITING_LINES = 3;
const hooks = { solved: () => {} };
export const onSolved = (fn) => { hooks.solved = fn; };
const keyed = (key, make) => { if (!play.jobs.has(key)) play.jobs.set(key, { key, ...make() }); return play.jobs.get(key); };

/** The street a hand would solve next from: the street being played, or its flop for a hand still waiting. */
function baseOf(hand) {
  if (hand !== current()) return { key: 'flop', solved: hand.flop };
  return { key: play.playing.seg.key, solved: play.playing.seg.solved };
}

/** How much a solve of the next street after line end `i` matters. */
function rankOf(hand, k, end, i) {
  if (hand !== current()) return 40 - 10 * k - i;
  return play.playing.waiting === end.id ? 100 : 80 - i;
}

/** Whether a line's end can still be reached from the decision the hand on screen stands at. */
function reachable(hand, base, end) {
  if (hand !== current()) return true;
  const nodes = base.solved.nodes; const from = play.playing.seg.node;
  for (let at = end; at >= 0; at = nodes[at].parent) if (at === from) return true;
  return false;
}

/** The solves one hand wants, each with how much it matters. */
function wantedFor(hand, k) {
  if (hand === current() && play.playing.done) return [];
  if (!hand.flop) return [];   // its flop is being solved by a flop worker
  const base = baseOf(hand); if (base.solved.cards.length >= 5) return [];
  const cards = hand.board.slice(0, base.solved.cards.length + 1);
  base.solved.ends ??= lineEnds(base.solved, cards);
  return base.solved.ends.flatMap((end, i) => {
    const at = slot(base.key, end.id);
    if (hand.next.has(at) || (hand !== current() && i >= WAITING_LINES) || !reachable(hand, base, end.id)) return [];
    return [[rankOf(hand, k, end, i), keyed(`${hand.id}|${at}`, () => ({ hand, at, ...streetJob(hand.config, base.solved, end.id, cards) }))]];
  });
}

/** Every solve wanted now, the most needed first. */
export const wanted = () => play.hands.flatMap(wantedFor).sort((a, b) => b[0] - a[0]).map(([, job]) => job);

/** A finished solve of a later street, kept with its hand. */
function keep(job, result) { play.jobs.delete(job.key); job.hand.next.set(job.at, result); }

/** What a hand's flop is taken to hold here, made slim, before one has come back. */
const GUESS = 2 * 2 ** 20;
/** Whether another hand may be dealt ahead: fewer than the number kept, and (past the first) within what the device can hold. */
function room() {
  const ahead = play.hands.filter((h) => h !== current());
  if (play.held || play.loading || ahead.length >= AHEAD || play.fails >= FAILS) return false;
  const each = play.typical || GUESS; const kept = ahead.reduce((t, h) => t + (h.bytes ?? each), 0);
  return !ahead.length || kept + each <= (play.config.budget ?? Infinity);
}

/** Let go of the hands solved ahead (the one being played stays), and deal no more until `resume`: Study is about to
 *  take a solve over, and a phone cannot hold both. */
export function hold() {
  play.held = true; const keep = current();
  play.hands = play.hands.filter((h) => h === keep);
  for (const [key, job] of play.jobs) if (job.hand !== keep) play.jobs.delete(key);
  status();
}
export function resume() { play.held = false; dealAhead(); status(); pump(); }

/** Hands dealt up to the number kept ahead, each one's flop asked of the flop workers. */
export function dealAhead() {
  while (room()) {
    const hand = dealHand(play.config, ++play.ids); play.hands.push(hand);
    ask(hand);
  }
}
/** Ask the flop workers for a hand's flop, made slim for it (`kept`: the flop kept on the device, read back). */
function ask(hand, kept = false) {   // `kept`: the key of the flop kept on the device, where the hand was dealt onto it
  say({ type: 'need', id: hand.id, epoch: play.epoch, config: hand.config, cards: hand.board.slice(0, 3), hand: { hero: hand.hero, seat: hand.seat, board: hand.board }, kept });
}

/** The flop kept on the device from the last time, if it was solved for one of this setup's spots with its betting: a
 *  hand is dealt onto it first (its own hole cards, turn and river), and a flop worker reads it back for that hand, which
 *  takes a few seconds where solving one takes most of a minute. */
export async function takeKept() {
  const epoch = play.epoch; play.loading = true; let kept = null;
  try { kept = await keptNote(); } catch { kept = null; }
  if (epoch !== play.epoch) return;
  play.loading = false;
  const spots = play.config.spots?.length ? play.config.spots : [{ oop: play.config.oop, ip: play.config.ip, pot: play.config.pot, stack: play.config.stack }];
  const spot = kept && spots.find((s) => sigOf({ ...play.config, ...s }) === kept.sig);
  if (!spot) return;
  const hand = dealHand(play.config, ++play.ids, { spot, flop: kept.cards });
  if (hand.hero < 0 || hand.villain < 0) return;
  play.hands.push(hand); ask(hand, kept.key ?? false);
}

/** A flop back from a flop worker: read into its hand, or the hand dropped where it could not be solved. */
export function gotFlop(data) {
  const hand = data.epoch === play.epoch ? play.hands.find((h) => h.id === data.id) : null; if (!hand || hand.flop) return;
  const flop = data.failed ? null : data.slim ?? null;
  if (flop) { hand.flop = flop; hand.bytes = GUESS; play.typical = GUESS; play.fails = 0; }
  else { play.fails++; play.hands.splice(play.hands.indexOf(hand), 1); if (!play.hands.some((h) => h.flop) && !current()) say({ type: 'error', message: `This setup cannot be solved${data.why ? ` (${data.why})` : ''}.` }); }
  status(); hooks.solved({ hand }); pump();
}

/** Step one solve: the most needed. False when nothing is wanted. */
function stepOnce(shown) {
  dealAhead();
  const list = wanted(); const job = list[0];
  if (play.jobs.size > list.length) { const live = new Set(list); for (const [key, j] of play.jobs) if (!live.has(j)) play.jobs.delete(key); }   // lines the hand has left behind
  if (!job) return false;
  let result; try { result = job.step(); } catch { result = { failed: true }; }
  if (result) { keep(job, result); status(); hooks.solved(job); return true; }
  if (Date.now() - shown.at > 200) { shown.at = Date.now(); say({ type: 'progress', street: job.street, ahead: job.hand !== current(), done: job.done() }); }
  return true;
}

let pumping = false;
/** Step the most needed solve, again and again, until nothing is wanted. */
export async function pump() {
  if (pumping) return; pumping = true;
  const shown = { at: 0 };
  try { while (stepOnce(shown)) await pause(); } finally { pumping = false; }
}

/** How many hands wait solved, and what is being solved. */
export function status() {
  const ready = play.hands.filter((h) => h !== current() && h.flop).length; const busy = wanted()[0]; const flops = play.hands.some((h) => !h.flop);
  say({ type: 'status', ready, solving: busy ? `${busy.street}${busy.hand === current() ? '' : ' ahead'}` : flops ? 'flop ahead' : '' });
}
