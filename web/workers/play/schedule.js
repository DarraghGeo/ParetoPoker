// Solving ahead of play: the solves wanted now, the most needed first (the street the hand on screen waits for, the rest
// of its next street, then the hands ahead: their flops, then the likeliest of their turns), stepped one chunk at a time.
import { flopJob, lineEnds, streetJob } from '../../solver/jobs.js';
import { pause } from '../../solver/progress.js';
import { dealHand } from './deal.js';
import { current, play, say, slot } from './state.js';

/** Hands kept solved ahead of the one being played. */
const AHEAD = 2;
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
  // the next hand's flop comes before anything of the hand being played but the street it is waiting for: villain's
  // thinking time covers a street solved when it is reached, and the next hand is then ready when this one ends
  if (!hand.flop) return [[k === 0 ? 90 : k === 1 ? 85 : 60 - 10 * k, keyed(`flop|${hand.id}`, () => ({ hand, ...flopJob(hand.config, hand.board.slice(0, 3)) }))]];
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

/** A finished solve: kept with its hand (a flop that cannot be solved drops the hand and says why). */
function keep(job, result) {
  play.jobs.delete(job.key);
  if (job.street !== 'flop') { job.hand.next.set(job.at, result); return; }
  if (!result.failed) { job.hand.flop = result; return; }
  play.hands.splice(play.hands.indexOf(job.hand), 1);
  say({ type: 'error', message: `This setup cannot be solved${result.why ? ` (${result.why})` : ''}.` });
}

/** Step one solve: the most needed. False when nothing is wanted. */
function stepOnce(shown) {
  while (play.hands.length < AHEAD + (current() ? 1 : 0)) play.hands.push(dealHand(play.config, ++play.ids));
  const job = wanted()[0]; if (!job) return false;
  let result; try { result = job.step(); } catch (e) { result = { failed: true, why: String(e?.message ?? e) }; }
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
  const ready = play.hands.filter((h) => h !== current() && h.flop).length; const busy = wanted()[0];
  say({ type: 'status', ready, solving: busy ? `${busy.street}${busy.hand === current() ? '' : ' ahead'}` : '' });
}
