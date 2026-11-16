// Solving ahead of play. The flops of the hands ahead are solved by the page's flop workers, beside this one: each hand
// dealt here is asked for there, and comes back as numbers read into a solve (`gotFlop`). Here are solved the later
// streets, the most needed first (the street the hand on screen waits for, the rest of its next street, then the likeliest
// turns of the hands ahead), stepped one chunk at a time.
import { flopFrom, lineEnds, streetJob } from '../../solver/jobs.js';
import { pause } from '../../solver/progress.js';
import { dealHand } from './deal.js';
import { current, play, say, slot } from './state.js';

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

/** The solves one hand wants, each with how much it matters. */
function wantedFor(hand, k) {
  if (hand === current() && play.playing.done) return [];
  if (!hand.flop) return [];   // its flop is being solved by a flop worker
  const base = baseOf(hand); if (base.solved.cards.length >= 5) return [];
  const cards = hand.board.slice(0, base.solved.cards.length + 1);
  base.solved.ends ??= lineEnds(base.solved, cards);
  return base.solved.ends.flatMap((end, i) => {
    const at = slot(base.key, end.id);
    if (hand.next.has(at) || (hand !== current() && i >= WAITING_LINES)) return [];
    return [[rankOf(hand, k, end, i), keyed(`${hand.id}|${at}`, () => ({ hand, at, ...streetJob(hand.config, base.solved, end.id, cards) }))]];
  });
}

/** Every solve wanted now, the most needed first. */
export const wanted = () => play.hands.flatMap(wantedFor).sort((a, b) => b[0] - a[0]).map(([, job]) => job);

/** A finished solve of a later street, kept with its hand. */
function keep(job, result) { play.jobs.delete(job.key); job.hand.next.set(job.at, result); }

/** Hands dealt up to the number kept ahead, each one's flop asked of the flop workers. */
export function dealAhead() {
  while (play.hands.length < AHEAD + (current() ? 1 : 0)) {
    const hand = dealHand(play.config, ++play.ids); play.hands.push(hand);
    say({ type: 'need', id: hand.id, epoch: play.epoch, config: hand.config, cards: hand.board.slice(0, 3) });
  }
}

/** A flop back from a flop worker: read into its hand, or the hand dropped where it could not be solved. */
export function gotFlop(data) {
  const hand = data.epoch === play.epoch ? play.hands.find((h) => h.id === data.id) : null; if (!hand || hand.flop) return;
  let flop = null; if (!data.failed) { try { flop = flopFrom(hand.config, hand.board.slice(0, 3), data.used, data.sums); } catch { flop = null; } }
  if (flop) hand.flop = flop;
  else { play.hands.splice(play.hands.indexOf(hand), 1); if (!play.hands.some((h) => h.flop) && !current()) say({ type: 'error', message: `This setup cannot be solved${data.why ? ` (${data.why})` : ''}.` }); }
  status(); hooks.solved({ hand }); pump();
}

/** Step one solve: the most needed. False when nothing is wanted. */
function stepOnce(shown) {
  dealAhead();
  const job = wanted()[0]; if (!job) return false;
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
