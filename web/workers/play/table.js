// The hand being played: villain's decisions drawn from his solved strategy for the hand he holds, hero's taken from the
// page, and at each street's end the next street solved again for the ranges that arrive (or, where it could not be,
// played on in the solve before it; all in, the cards are dealt to the showdown).
import * as fs from 'poker-flopsolve';
import { ruleAt } from '../../../src/rules/at.js';
import { follows } from '../../../src/rules/rules.js';
import { text } from '../../solver/deck.js';
import { streetOf } from '../../solver/jobs.js';
import { dealAhead, pump, status } from './schedule.js';
import { current, play, slot } from './state.js';
import { rangesOf, strategyOf, worthOf } from './solved.js';
import { post, reviewOf } from './view.js';

const seatOf = (node) => (node.seat === 'oop' ? 0 : 1);
export const nodeOf = (seg) => seg.solved.nodes[seg.node];
const boardOf = (seg) => [...seg.solved.cards, ...seg.dealt];

/** Start the next hand whose flop is solved, dropping the one just played. False when none is ready yet. */
export function start() {
  const done = current();
  if (done) { play.hands.splice(play.hands.indexOf(done), 1); for (const [key, job] of play.jobs) if (job.hand === done) play.jobs.delete(key); }
  play.playing = null;
  const hand = play.hands.find((h) => h.flop);
  if (!hand) { dealAhead(); status(); pump(); return false; }
  play.hands.splice(play.hands.indexOf(hand), 1); play.hands.unshift(hand);
  play.playing = { hand, me: hand.seat === 'oop' ? 0 : 1, seg: { key: 'flop', solved: hand.flop, node: 0, dealt: [] }, history: [{ street: 'flop', actions: [], pot: hand.config.pot, cards: text(hand.board.slice(0, 3)) }], step: 0, put: [0, 0], pot0: hand.config.pot, waiting: null, done: null, streets: {}, last: {} };
  proceed();
  return true;
}

/** Villain's action at a decision: one drawn by its frequency for his hand (check or call if his hand is not there). */
function villainChoice(seg, node, combo) {
  const st = strategyOf(seg, node); const i = st.at(combo);
  if (i < 0) return node.edges.findIndex((e) => e.kind === 'check' || e.kind === 'call');
  let roll = Math.random();
  for (let a = 0; a < st.n; a++) { roll -= st.probs[i * st.n + a]; if (roll <= 0) return a; }
  return st.n - 1;
}

/** How the solution plays hero's hand at a decision: each action's label and how often, or null if the hand is not there. */
function mixOf(seg, node, combo) {
  const st = strategyOf(seg, node); const i = st.at(combo);
  return i < 0 ? null : node.edges.map((e, a) => ({ label: e.label, kind: e.kind, freq: Math.round(1e3 * st.probs[i * st.n + a]) / 1e3 }));
}

/** A hand the solution brings to a decision less often than this, of the times it is dealt, has no play there to speak
 *  of: the solution's strategy is an average over the times a hand gets somewhere, so where it (nearly) never does, what
 *  it shows is filler, and so is anything worth worked out from it. */
const OFF_LINE = 0.01;
/** A move the solution makes with the hand less often than this is an error: the hand stops there, since past it the
 *  solution has no play for the hand to be set against (the same bar as the red dot: lib/play/grade.js). */
const ERROR = 0.03;
/** How often the solution gets to a decision with hero's hand, of the times it is dealt. */
function reachOf(p, node) {
  const reach = rangesOf(p.seg, node)[p.me][p.hand.hero] ?? 0;
  return p.hand.weight > 0 ? reach / p.hand.weight : 0;
}

/** Whether hero faces a raise of his own bet: two or more bets before this decision on its street. */
function raisedAt(nodes, node) {
  let wagers = 0;
  for (let at = node; at.parent >= 0 && nodes[at.parent].round === node.round; at = nodes[at.parent]) { const via = nodes[at.parent].edges[at.via]; if (nodes[at.parent].kind === 'decision' && !['check', 'call', 'fold'].includes(via.kind)) wagers++; }
  return wagers >= 2;
}

/** A rule the solution plays along with at least this often with the hand has held; so has one whose advice costs less than `NEAR` chips. */
const HELD = 0.5; const NEAR = 0.1;
/**
 * The player's rule at hero's decision (src/rules), what it says for his hand, and how it stands against the solution:
 * how often the solution does what the rule says with this hand, what doing it gives up, and so whether the rule held.
 */
function ruleOf(p, node, mix, worth) {
  try {
    const seg = p.seg; const board = boardOf(seg).slice(0, seg.solved.cards.length + node.round); const ranges = rangesOf(seg, node); const range = (who) => ranges[who];
    const toCall = node.invested[1 - p.me] - node.invested[p.me];
    const rule = ruleAt(fs, { board, mine: range(p.me), his: range(1 - p.me), combo: p.hand.hero, ip: p.me === 1, toCall, pot: node.pot, raised: raisedAt(seg.solved.nodes, node), raiser: p.hand.config.raiser ?? null });
    if (!rule) return null;
    const match = mix.map((x) => follows(rule.says, x.kind, toCall > 0)); if (!match.some(Boolean)) return null;   // the tree has no such action
    const freq = mix.reduce((t, x, i) => t + (match[i] ? x.freq : 0), 0);
    const cost = worth ? Math.max(...worth) - Math.max(...worth.filter((_, i) => match[i])) : null;
    return { id: rule.id, says: rule.says, why: rule.why, freq: Math.round(1e3 * freq) / 1e3, cost: cost == null ? null : Math.round(100 * cost) / 100, held: freq >= HELD || (cost != null && cost < NEAR) };
  } catch { return null; }
}

/** Take action `k` at a decision: the chips it puts in, the line, and a fold ends the hand. */
function take(p, node, k) {
  const edge = node.edges[k]; const who = seatOf(node); const add = edge.kind !== 'fold' && edge.kind !== 'check' ? edge.to - node.invested[who] : 0;
  p.put[who] += add; p.step++;
  p.history[p.history.length - 1].actions.push({ who: who === p.me ? 'hero' : 'villain', label: edge.label, kind: edge.kind, add: Math.round(add * 100) / 100 });
  if (edge.kind === 'fold') p.done = { folded: who === p.me ? 'hero' : 'villain' };
  else p.seg.node = edge.child;
}

/** The end of a street: the next one solved again, played on in this solve, or waited for. False while waiting. */
function deal(p, node) {
  const seg = p.seg; const at = slot(seg.key, node.id); const next = p.hand.next.get(at);
  const allIn = seg.solved.nodes[node.edges[0].child]?.kind !== 'decision';
  if (next === undefined && !seg.dealt.length && !allIn) { p.waiting = node.id; return false; }
  p.step++; p.history.push({ street: streetOf([...boardOf(seg), 0]), actions: [], pot: Math.round((p.pot0 + p.put[0] + p.put[1]) * 100) / 100, cards: text([p.hand.board[boardOf(seg).length]]) });
  // a street that could not be solved again cannot be played on in a slim flop: the hand is checked down
  if (next?.failed && seg.solved.slim && !allIn) { p.done = { showdown: true }; return false; }
  if (next && !next.failed && !allIn) { p.seg = { key: at, solved: next, node: 0, dealt: [] }; p.streets[p.history.length - 1] = next; return true; }   // the street as solved again, by its place in the history
  seg.dealt.push(p.hand.board[boardOf(seg).length]); seg.node = node.edges[0].child;
  return true;
}

/** One step of play from where the hand stands; false when hero is to act, the hand waits or it is over. */
function advance(p) {
  const node = nodeOf(p.seg);
  if (node.kind === 'showdown') { p.done = { showdown: true }; return false; }
  if (node.kind === 'chance') return deal(p, node);
  if (node.kind !== 'decision' || seatOf(node) === p.me) return false;
  p.last.villain = reviewOf(p.seg, node);   // his last decision, to look back on once the hand is over
  take(p, node, villainChoice(p.seg, node, p.hand.villain));
  return true;
}

/** Play on until hero is to act, the hand waits for a street or it is over; then tell the page and solve on. */
export function proceed() {
  const p = play.playing; if (!p) return;
  p.waiting = null;
  // every step is told to the page, which shows them one at a time, on the clock: first where the hand stands (so a
  // villain who acts first is seen to think), then each step
  post(p);
  for (let guard = 0; guard < 64 && !p.done && advance(p); guard++) post(p);
  post(p); status(); pump();
}

/** A hand's cell of the 13x13 chart: its two ranks, and whether it is suited, offsuit or a pair. */
const cellKey = (name) => [name[0], name[2]].sort().join('') + (name[0] === name[2] ? '' : name[1] === name[3] ? 's' : 'o');
/** The hands of hero's range in the same cell as his own (his own among them), each with what the solution does with it. */
const twinsOf = (hands, hero) => hands.filter(([name, , mix]) => mix && cellKey(name) === cellKey(hero)).map(([name, , mix]) => ({ name, mix }));

/** Hero's action, by its label, at the decision on screen. */
export function heroActs(label) {
  const p = play.playing; if (!p || p.done) return;
  const node = nodeOf(p.seg); const k = node.edges.findIndex((e) => e.label === label);
  if (node.kind !== 'decision' || seatOf(node) !== p.me || k < 0) return;
  p.last.hero = reviewOf(p.seg, node); const twins = twinsOf(p.last.hero.hands, fs.formatCombo(p.hand.hero));
  // off the solution's line (hero left it earlier in the hand) there is nothing to set the move against, and nothing is charged
  const off = reachOf(p, node) < OFF_LINE;
  const mix = off ? null : mixOf(p.seg, node, p.hand.hero); const worth = mix ? worthOf(p.seg, node, p.hand.hero) : null;
  const cost = worth ? Math.round(100 * (Math.max(...worth) - worth[k])) / 100 : null; const rule = mix ? ruleOf(p, node, mix, worth) : null;
  take(p, node, k);
  if (mix) Object.assign(p.history[p.history.length - 1].actions.at(-1), { mix, cost, rule, twins }); else if (off) p.history[p.history.length - 1].actions.at(-1).off = true;   // for the page to say how the move stands against the solution
  // an error ends the hand where it was made (a fold has ended it already)
  if (mix && !p.done && (mix.find((x) => x.label === label)?.freq ?? 1) < ERROR) p.done = { stopped: true };
  post(p); proceed();
}
