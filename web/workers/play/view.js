// What the page shows of the hand being played: the board, pot and stacks, the line so far, hero's choices when it is
// his turn, both ranges at the decision on screen, how the hand ended, and the address and solve for Study.
import * as fs from 'poker-flopsolve';
import { cardsOf, onBoard, text } from '../../solver/deck.js';
import { play, say } from './state.js';

const cents = (x) => Math.round(x * 100) / 100;
const boardOf = (seg) => [...seg.solved.cards, ...seg.dealt];
const decisionOf = (seg) => { const node = seg.solved.nodes[seg.node]; return node.kind === 'decision' ? node : null; };

/** One range at a decision: each hand held, by name, with its weight. */
function rangeAt(seg, node, who) {
  const board = boardOf(seg); const found = seg.solved.spot.resolveBoard(board);
  const weights = onBoard(seg.solved.solution.reachAt(node.id, found.board, who), found, board);
  return weights.flatMap((w, c) => (w > 1e-6 ? [[fs.formatCombo(c), Math.round(w * 1e4) / 1e4]] : []));
}

/** Chips won from the flop on by whoever takes the pot (hero's view), and how the hand ended. */
function resultOf(p) {
  const won = (who) => (who === p.me ? p.pot0 + p.put[1 - p.me] : -p.put[p.me]);
  if (p.done.folded) return { how: `${p.done.folded === 'hero' ? 'You' : 'Villain'} folded`, net: cents(won(p.done.folded === 'hero' ? 1 - p.me : p.me)) };
  const strength = (combo) => fs.evaluateCards([...p.hand.board, ...cardsOf(combo)]);
  const [mine, his] = [strength(p.hand.hero), strength(p.hand.villain)];
  const name = (v) => fs.CATEGORY_NAMES[fs.categoryOf(v)];
  const net = mine > his ? won(p.me) : mine < his ? won(1 - p.me) : (p.pot0 + p.put[1 - p.me] - p.put[p.me]) / 2;
  return { how: mine > his ? 'You win at showdown' : mine < his ? 'Villain wins at showdown' : 'Split pot', net: cents(net), mine: name(mine), his: name(his) };
}

/** The actions from the street's own start to the decision on screen. */
function lineIn(seg) {
  const nodes = seg.solved.nodes; const line = []; let at = seg.node;
  while (nodes[at].parent >= 0) { const parent = nodes[nodes[at].parent]; if (parent.kind === 'decision') line.unshift(parent.edges[nodes[at].via].label); at = parent.id; }
  return line;
}

/** Study's view of the decision: the flop, the whole line, the cards dealt, and the street's solve to hand over. */
function studyOf(p, node) {
  if (!node) return null;
  const inStreet = lineIn(p.seg); const before = p.history.slice(0, -1).flatMap((h) => h.actions.map((a) => a.label));
  const own = p.seg.key === 'flop';
  return { flop: text(p.hand.board.slice(0, 3)), line: own ? inStreet : [...before, ...inStreet], streetLine: inStreet, dealt: boardOf(p.seg).slice(3).map((c) => fs.formatCard(c)), share: `${p.hand.id}|${p.seg.key}` };
}

/** Hero's choices at his decision: each action's label, kind and the chips it adds. */
const choicesAt = (node, me) => node.edges.map((e) => ({ label: e.label, kind: e.kind, add: cents(e.to - node.invested[me]) }));

/** Tell the page where the hand stands. */
export function post(p) {
  const node = p.done ? null : decisionOf(p.seg); const toAct = !!node && (node.seat === 'oop' ? 0 : 1) === p.me;
  const shown = p.done?.showdown ? p.hand.board : boardOf(p.seg);
  say({
    type: 'state', id: p.hand.id, step: p.step, stack: play.config.stack, seat: p.hand.seat, hero: fs.formatCombo(p.hand.hero), villain: p.done?.showdown ? fs.formatCombo(p.hand.villain) : null,
    board: text(shown), pot: cents(p.pot0 + p.put[0] + p.put[1]), behind: p.put.map((x) => cents(play.config.stack - x)), history: p.history,
    toAct, waiting: p.waiting != null, actions: toAct ? choicesAt(node, p.me) : [], actor: node?.seat ?? null,
    ranges: node ? { oop: rangeAt(p.seg, node, 0), ip: rangeAt(p.seg, node, 1) } : null,
    result: p.done ? resultOf(p) : null, study: toAct ? studyOf(p, node) : null,   // Study is for hero's own decisions, not villain's between them
  });
}
