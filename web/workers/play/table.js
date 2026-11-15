// The hand being played: villain's decisions drawn from his solved strategy for the hand he holds, hero's taken from the
// page, and at each street's end the next street solved again for the ranges that arrive (or, where it could not be,
// played on in the solve before it; all in, the cards are dealt to the showdown).
import { streetOf } from '../../solver/jobs.js';
import { pump, status } from './schedule.js';
import { current, play, slot } from './state.js';
import { post } from './view.js';

const seatOf = (node) => (node.seat === 'oop' ? 0 : 1);
export const nodeOf = (seg) => seg.solved.nodes[seg.node];
const boardOf = (seg) => [...seg.solved.cards, ...seg.dealt];

/** Start the next hand whose flop is solved, dropping the one just played. False when none is ready yet. */
export function start() {
  const done = current();
  if (done) { play.hands.splice(play.hands.indexOf(done), 1); for (const [key, job] of play.jobs) if (job.hand === done) play.jobs.delete(key); }
  play.playing = null;
  const hand = play.hands.find((h) => h.flop);
  if (!hand) { status(); pump(); return false; }
  play.hands.splice(play.hands.indexOf(hand), 1); play.hands.unshift(hand);
  play.playing = { hand, me: hand.seat === 'oop' ? 0 : 1, seg: { key: 'flop', solved: hand.flop, node: 0, dealt: [] }, history: [{ street: 'flop', actions: [] }], put: [0, 0], pot0: play.config.pot, waiting: null, done: null };
  proceed();
  return true;
}

/** Villain's action at a decision: one drawn by its frequency for his hand (check or call if his hand is not there). */
function villainChoice(seg, node, combo) {
  const found = seg.solved.spot.resolveBoard(boardOf(seg).slice(0, seg.solved.cards.length + node.round));
  const view = seg.solved.solution.strategyAt(node.id, found.board); const n = view.actions.length;
  const i = view.combos.indexOf(found.combos[combo]);
  if (i < 0) return node.edges.findIndex((e) => e.kind === 'check' || e.kind === 'call');
  let roll = Math.random();
  for (let a = 0; a < n; a++) { roll -= view.probs[i * n + a]; if (roll <= 0) return a; }
  return n - 1;
}

/** Take action `k` at a decision: the chips it puts in, the line, and a fold ends the hand. */
function take(p, node, k) {
  const edge = node.edges[k]; const who = seatOf(node);
  if (edge.kind !== 'fold' && edge.kind !== 'check') p.put[who] += edge.to - node.invested[who];
  p.history[p.history.length - 1].actions.push({ who: who === p.me ? 'hero' : 'villain', label: edge.label, kind: edge.kind });
  if (edge.kind === 'fold') p.done = { folded: who === p.me ? 'hero' : 'villain' };
  else p.seg.node = edge.child;
}

/** The end of a street: the next one solved again, played on in this solve, or waited for. False while waiting. */
function deal(p, node) {
  const seg = p.seg; const at = slot(seg.key, node.id); const next = p.hand.next.get(at);
  const allIn = seg.solved.nodes[node.edges[0].child]?.kind !== 'decision';
  if (next === undefined && !seg.dealt.length && !allIn) { p.waiting = node.id; return false; }
  p.history.push({ street: streetOf([...boardOf(seg), 0]), actions: [] });
  if (next && !next.failed && !allIn) { p.seg = { key: at, solved: next, node: 0, dealt: [] }; return true; }
  seg.dealt.push(p.hand.board[boardOf(seg).length]); seg.node = node.edges[0].child;
  return true;
}

/** One step of play from where the hand stands; false when hero is to act, the hand waits or it is over. */
function advance(p) {
  const node = nodeOf(p.seg);
  if (node.kind === 'showdown') { p.done = { showdown: true }; return false; }
  if (node.kind === 'chance') return deal(p, node);
  if (node.kind !== 'decision' || seatOf(node) === p.me) return false;
  take(p, node, villainChoice(p.seg, node, p.hand.villain));
  return true;
}

/** Play on until hero is to act, the hand waits for a street or it is over; then tell the page and solve on. */
export function proceed() {
  const p = play.playing; if (!p) return;
  p.waiting = null;
  for (let guard = 0; guard < 64 && !p.done && advance(p); guard++);
  post(p); status(); pump();
}

/** Hero's action, by its label, at the decision on screen. */
export function heroActs(label) {
  const p = play.playing; if (!p || p.done) return;
  const node = nodeOf(p.seg); const k = node.edges.findIndex((e) => e.label === label);
  if (node.kind !== 'decision' || seatOf(node) !== p.me || k < 0) return;
  take(p, node, k); proceed();
}
