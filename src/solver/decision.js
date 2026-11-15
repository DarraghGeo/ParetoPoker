// Everything about one decision: who acts, the price, each hand's strategy and what each action is worth to it, and the
// other player's range with his answer to each bet or raise. On the river a hand has a made strength and each action a
// value; before it, an equity against the other range instead (`hand.equity`), and `strength` and `values` are null.
import { frameAt } from '../explain/account.js';
import { evaluator } from '../explain/best.js';
import { cardsOf, facingOf } from '../combos.js';
import { equityVs } from './equity.js';


/** Both players' reach on the real board (the solver may keep one board for several that mirror each other). */
function reaches(fs, solution, id, at, stored, board, me) {
  const mineStored = solution.reachAt(id, at, me); const hisStored = solution.reachAt(id, at, 1 - me);
  const onBoard = new Set(board); const mine = new Float64Array(fs.COMBOS); const his = new Float64Array(fs.COMBOS);
  for (let c = 0; c < fs.COMBOS; c++) {
    const [a, b] = cardsOf(fs, c); if (onBoard.has(a) || onBoard.has(b)) continue;
    mine[c] = mineStored[stored[c]]; his[c] = hisStored[stored[c]];
  }
  return { mine, his };
}

/** How each of his hands answers an action of ours that leads to his decision: fold, check behind, call, or put more in. */
function answersTo(solution, nodes, edge, at) {
  if (nodes[edge.child].kind !== 'decision') return null;
  const reply = solution.strategyAt(edge.child, at); const m = reply.actions.length;
  const [fold, passive, call] = ['fold', 'check', 'call'].map((label) => reply.actions.findIndex((l) => l === label));
  const byCombo = new Map();
  reply.combos.forEach((combo, i) => {
    const p = (k) => (k >= 0 ? reply.probs[i * m + k] : 0);
    byCombo.set(combo, { fold: p(fold), check: p(passive), call: p(call), more: Math.max(0, 1 - p(fold) - p(passive) - p(call)) });
  });
  return byCombo;
}

/** The hands of the player to act, each with its strategy (and, on the river, what each action is worth to it). */
function heroHands(fs, r) {
  const row = new Map(); r.view.combos.forEach((combo, i) => row.set(combo, i));
  const n = r.view.actions.length; const facing = facingOf(fs, r.his); const hands = [];
  for (let combo = 0; combo < fs.COMBOS; combo++) {
    if (!(r.mine[combo] > 1e-6) || !row.has(r.stored[combo])) continue;
    const i = row.get(r.stored[combo]); const strength = r.made(combo);
    hands.push({ id: combo, name: fs.formatCombo(combo), cards: cardsOf(fs, combo), weight: r.mine[combo], strength: r.river ? strength : null, category: fs.categoryOf(strength), equity: r.equity ? r.equity[0][combo] : undefined,
      strategy: Array.from({ length: n }, (_, a) => r.view.probs[i * n + a]), values: r.values && facing(combo) > 0 ? r.values.map((v) => v[combo]) : null });
  }
  return hands;
}

/** His range here, each hand with its answer to each of our actions. */
function villainHands(fs, solution, nodes, node, r) {
  const answers = node.edges.map((edge) => answersTo(solution, nodes, edge, r.at)); const villain = [];
  for (let c = 0; c < fs.COMBOS; c++) {
    if (!(r.his[c] > 1e-6)) continue;
    villain.push({ id: c, name: fs.formatCombo(c), cards: cardsOf(fs, c), weight: r.his[c], strength: r.river ? r.made(c) : null, category: fs.categoryOf(r.made(c)), equity: r.equity ? r.equity[1][c] : undefined, answers: answers.map((map) => map?.get(r.stored[c]) ?? null) });
  }
  return villain;
}

/** What the decision is read from: the board, both reaches, the strategy, and (river) values or (before it) equities.
 *  A value is an action taken and then the best reply to his solved strategy: the solver's own values have the hand
 *  follow its solved strategy afterwards, which for an action it never takes is untrained and means nothing. */
function readingOf(fs, solution, nodes, id, board, dealt, me) {
  const found = solution.spot.resolveBoard(board); const at = found.board; const river = board.length === 5;
  const { mine, his } = reaches(fs, solution, id, at, found.combos, board, me);
  const values = river ? evaluator(fs, solution, nodes)(frameAt(fs, solution, nodes, id, dealt), 'best') : null;
  const equity = river ? null : [equityVs(fs, board, mine, his), equityVs(fs, board, his, mine)];
  return { at, stored: found.combos, river, mine, his, values, equity, view: solution.strategyAt(id, at), made: (combo) => fs.evaluateCards([...board, ...cardsOf(fs, combo)]) };
}

/**
 * @param {number[]} [dealt] The cards dealt after the spot's own board, in order, as card numbers.
 * @returns {import('../explain/river.js').Decision}
 */
export function decisionAt(fs, solution, nodes, id, dealt = []) {
  const node = nodes[id]; if (node.kind !== 'decision') return null;
  const board = [...solution.spot.board, ...dealt.slice(0, node.round)];
  if (board.length !== solution.spot.board.length + node.round) return null;
  const me = node.seat === 'oop' ? 0 : 1; const r = readingOf(fs, solution, nodes, id, board, dealt, me);
  const mineIn = node.invested[me];
  const actions = node.edges.map((edge) => ({ kind: edge.kind, label: edge.label, add: edge.kind === 'fold' || edge.kind === 'check' ? 0 : edge.to - mineIn, child: edge.child }));
  return { street: ['flop', 'turn', 'river'][board.length - 3], board: [...board], boardText: fs.formatCards(board), categories: [...fs.CATEGORY_NAMES], seat: node.seat, pot: node.pot, toCall: node.invested[1 - me] - mineIn, invested: mineIn, actions, hands: heroHands(fs, r), villain: villainHands(fs, solution, nodes, node, r) };
}
