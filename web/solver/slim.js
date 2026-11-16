// A solved flop made slim for Play. A flop solve holds every turn and river after it, which is where its size is (75 to
// 120 MB of strategy), and Play never reads those: it solves each turn and river again for the ranges that arrive. So,
// once a flop is solved, everything Play needs of it is read off for the hand that will be dealt onto it, and the solve is
// let go of: each flop decision's strategy and both ranges there, the ranges arriving after each line that leads to this
// hand's turn card, and, for hero's own hand at his own flop decisions, what each action is worth and why he plays as
// he does. That comes to a few hundred kilobytes.
import * as fs from 'poker-flopsolve';
import { RARE, explainStreet, measure, study } from '../../src/explain/street.js';
import { arriving, lineEnds } from './jobs.js';
import { onBoard } from './deck.js';

/** A flop decision's strategy (a row for each hand held, found by `index[combination]`) and both ranges there, by real combination. */
function decisionOf(solved, found, node) {
  const view = solved.solution.strategyAt(node.id, found.board); const where = new Map(Array.from(view.combos, (c, i) => [c, i]));
  const index = new Int32Array(fs.COMBOS).fill(-1); for (let c = 0; c < fs.COMBOS; c++) index[c] = where.get(found.combos[c]) ?? -1;
  const reach = [0, 1].map((p) => Float32Array.from(onBoard(solved.solution.reachAt(node.id, found.board, p), found, solved.cards)));
  return { n: view.actions.length, probs: Float32Array.from(view.probs), index, reach };
}

/** After each flop line that leads to a turn: the ranges that arrive on this hand's turn card, and the pot and stacks there. */
function endsOf(solved, turn) {
  const found = solved.spot.resolveBoard(turn);
  return lineEnds(solved, turn).map((end) => {
    const sub = solved.solution.subgameAt(solved.nodes[end.id].edges[0].child, found.board, {});
    return { ...end, ranges: arriving(solved, end.id, turn).map((r) => Float32Array.from(r)), sub: { pot: sub.pot, stack: sub.stack } };
  });
}

/** Hero's hand at one of his flop decisions: what each action is worth to it (chips; null where it never gets there), and why it plays as it does. */
function heroAt(solved, id, hero) {
  try {
    const st = study(fs, solved.solution, solved.nodes, id, []); if (!st) return null;
    const t = explainStreet(st, measure(st, hero, { worth: Math.min(...st.lineReach) >= RARE }), null);
    const told = t && { name: t.name, line: t.line, detail: t.detail, reasons: t.reasons.map((r) => ({ text: r.text, detail: r.detail ?? null })), silent: t.silent };
    const worth = st.actions.map((_, a) => st.closely(a).value[hero]);
    return { told, worth: worth.some((x) => Number.isNaN(x)) ? null : worth };
  } catch { return null; }
}

/**
 * @param solved A solved flop (jobs.js: `flopJob`'s result, or `flopFrom`'s).
 * @param {{ hero: number, seat: 'oop'|'ip', board: number[] }} hand The hand dealt onto it: hero's combination and seat, and its five board cards.
 * @returns A plain object that can be posted between workers; `slim: true` marks it for the code that reads either kind.
 */
export function slimFlop(solved, hand) {
  const found = solved.spot.resolveBoard(solved.cards); const at = {}; const mine = {};
  for (const node of solved.nodes) {
    if (node.kind !== 'decision' || node.round !== 0) continue;
    at[node.id] = decisionOf(solved, found, node);
    if (node.seat === hand.seat) mine[node.id] = heroAt(solved, node.id, hand.hero);
  }
  return { street: 'flop', slim: true, cards: solved.cards, nodes: solved.nodes, stack: solved.stack, pot: solved.pot, used: solved.used ?? {}, at, mine, ends: endsOf(solved, hand.board.slice(0, 4)) };
}
