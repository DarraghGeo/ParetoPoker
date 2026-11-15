// The decisions on a solved street worth asking about: first to act, checked to, facing a bet, facing a bet after
// checking; drawn at random, the first decision and the unopened ones three times as likely.
import * as fs from 'poker-flopsolve';
import { decisionAt } from '../../src/solver/flopsolve.js';

/** The open decisions of the street's first round, two actions deep, each with how likely it is to be drawn. */
function openDecisions(nodes) {
  const open = [];
  const reach = (id, depth) => {
    const node = nodes[id];
    if (node.kind !== 'decision' || node.round !== 0) return;
    open.push({ id, weight: depth === 0 || !node.invested.some((x) => x > 0) ? 3 : 1 });
    if (depth >= 2) return;
    for (const edge of node.edges) if (edge.kind !== 'fold' && edge.kind !== 'call') reach(edge.child, depth + 1);
  };
  reach(0, 0);
  return open;
}

/** One entry drawn by weight, taken out of the list. */
function drawOut(open) {
  let roll = Math.random() * open.reduce((t, o) => t + o.weight, 0); let k = 0;
  while (k < open.length - 1 && (roll -= open[k].weight) > 0) k++;
  return open.splice(k, 1)[0];
}

/** The actions from the street's start to a node. */
function lineTo(nodes, id) {
  const line = []; let at = id;
  while (nodes[at].parent >= 0) { const parent = nodes[nodes[at].parent]; line.unshift(parent.edges[nodes[at].via].label); at = parent.id; }
  return line;
}

const held = (list) => list.reduce((t, h) => t + h.weight, 0);
const cardText = (cards) => cards.map((c) => fs.formatCard(c));

/** A decision as the page takes it, or null when a range at it holds too little to ask about. */
function asked(solved, id) {
  const d = decisionAt(fs, solved.solution, solved.nodes, id, []);
  if (!d || held(d.hands) < 6 || held(d.villain) < 6) return null;
  const me = d.seat === 'oop' ? 0 : 1;
  const history = (solved.history ?? []).map((h) => ({ ...h, cards: cardText(h.cards) }));
  return { ...d, line: lineTo(solved.nodes, id), behind: solved.stack - solved.nodes[id].invested[me], history, flop: cardText(solved.cards.slice(0, 3)), solve: solved.solve ?? null };
}

/** Up to `count` decisions on a solved street to ask about. */
export function positions(solved, count) {
  const open = openDecisions(solved.nodes); const decisions = [];
  while (open.length && decisions.length < count) {
    const d = asked(solved, drawOut(open).id);
    if (d) decisions.push(d);
  }
  return decisions;
}
