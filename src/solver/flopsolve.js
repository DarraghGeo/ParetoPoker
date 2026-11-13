import { notation } from '../notation.js';
import { frameAt } from '../explain/account.js';
import { evaluator } from '../explain/best.js';

/**
 * Reads a spot solved by poker-flopsolve into the plain shape the explainer takes.
 *
 * The solver module is passed in (`fs`), so the same code runs in Node and in a browser worker.
 * A spot may start on the flop, the turn or the river; past a deal, a decision is read on the
 * cards that were dealt.
 */

/** The betting tree as plain objects: `nodes[id] = { id, kind, seat, pot, path, parent, edges }`. */
export function treeOf(fs, spot) {
  const { tree, chipScale } = spot;
  const kinds = ['decision', 'chance', 'fold', 'showdown'];
  const nodes = [];
  for (let id = 0; id < tree.nodeCount; id++) {
    const edges = [];
    for (let k = 0; k < tree.numEdges[id]; k++) {
      const e = tree.firstEdge[id] + k;
      edges.push({ kind: fs.ACTION_LABELS[tree.edgeAction[e]], to: tree.edgeTarget[e] / chipScale, child: tree.edgeChild[e] });
    }
    nodes.push({ id, kind: kinds[tree.kind[id]], round: tree.round[id], seat: tree.player[id] < 0 ? null : tree.player[id] === 0 ? 'oop' : 'ip', pot: tree.pot[id] / chipScale, edges, parent: -1, via: -1, invested: [0, 0] });
  }
  // What each player has put in on the way to every node
  const walk = (id) => {
    const node = nodes[id];
    const me = node.seat === 'oop' ? 0 : 1;
    node.edges.forEach((edge, k) => {
      // a deal has one way on: the first decision of the next street
      if (node.kind === 'chance') { edge.kind = 'deal'; edge.label = ''; const next = nodes[edge.child]; next.parent = id; next.via = k; next.invested = [...node.invested]; walk(edge.child); return; }
      edge.label = notation(edge.kind, { add: edge.to - node.invested[me], pot: node.pot, to: edge.to, faced: node.invested[1 - me] });
      const child = nodes[edge.child];
      child.parent = id;
      child.via = k;
      child.invested = [...node.invested];
      if (edge.kind !== 'fold' && edge.kind !== 'check') child.invested[node.seat === 'oop' ? 0 : 1] = edge.to;
      walk(edge.child);
    });
  };
  walk(0);
  return nodes;
}

/**
 * Each hand's equity against a range on a board of three, four or five cards, every card still
 * to come dealt out, with the cards each hand removes from the other range.
 *
 * @param {number[]} board
 * @param {ArrayLike<number>} mine Weights, one per combination.
 * @param {ArrayLike<number>} his
 * @returns {Float64Array} NaN where a hand is not held or has nothing to face.
 */
export function equityVs(fs, board, mine, his) {
  const N = fs.COMBOS;
  const taken = new Uint8Array(52);
  for (const c of board) taken[c] = 1;
  const A = new Uint8Array(N); const B = new Uint8Array(N);
  const live = [];
  for (let c = 0; c < N; c++) { A[c] = fs.COMBO_CARDS[2 * c]; B[c] = fs.COMBO_CARDS[2 * c + 1]; if ((mine[c] > 0 || his[c] > 0) && !taken[A[c]] && !taken[B[c]]) live.push(c); }
  const win = new Float64Array(N); const mass = new Float64Array(N);
  const strength = new Float64Array(N);
  const below = new Float64Array(52); const upto = new Float64Array(52); const every = new Float64Array(52);
  const cards = [...board, 0, 0, 0, 0].slice(0, 7);
  const deal = (x, y) => {
    // one way the board can finish: x and y are the cards to come (-1: none)
    const full = board.length + (x >= 0) + (y >= 0);
    if (x >= 0) cards[board.length] = x;
    if (y >= 0) cards[board.length + 1] = y;
    const heroes = []; const others = [];
    for (const c of live) {
      if (A[c] === x || A[c] === y || B[c] === x || B[c] === y) continue;
      cards[full] = A[c]; cards[full + 1] = B[c];
      strength[c] = fs.evaluateCards(cards.slice(0, full + 2));
      if (mine[c] > 0) heroes.push(c);
      if (his[c] > 0) others.push(c);
    }
    const order = (p, q) => strength[p] - strength[q];
    heroes.sort(order); others.sort(order);
    below.fill(0); upto.fill(0); every.fill(0);
    let all = 0;
    for (const v of others) { all += his[v]; every[A[v]] += his[v]; every[B[v]] += his[v]; }
    let lt = 0; let le = 0; let sumBelow = 0; let sumUpto = 0;
    for (const h of heroes) {
      const s = strength[h];
      while (lt < others.length && strength[others[lt]] < s) { const v = others[lt++]; sumBelow += his[v]; below[A[v]] += his[v]; below[B[v]] += his[v]; }
      while (le < others.length && strength[others[le]] <= s) { const v = others[le++]; sumUpto += his[v]; upto[A[v]] += his[v]; upto[B[v]] += his[v]; }
      // the same two cards in his range were taken out twice, once for each card
      const own = his[h] > 0 ? his[h] : 0;
      const beats = sumBelow - below[A[h]] - below[B[h]];
      const ties = sumUpto - upto[A[h]] - upto[B[h]] + own - beats;
      win[h] += beats + ties / 2;
      mass[h] += all - every[A[h]] - every[B[h]] + own;
    }
  };
  const deck = []; for (let c = 0; c < 52; c++) if (!taken[c]) deck.push(c);
  if (board.length === 5) deal(-1, -1);
  else if (board.length === 4) for (const x of deck) deal(x, -1);
  else for (let i = 0; i < deck.length; i++) for (let j = i + 1; j < deck.length; j++) deal(deck[i], deck[j]);
  const out = new Float64Array(N).fill(NaN);
  for (const h of live) if (mine[h] > 0 && mass[h] > 0) out[h] = win[h] / mass[h];
  return out;
}

/**
 * Everything about one decision: who acts, the price, each hand's strategy and what each action
 * is worth to it, and the other player's range with his answer to each bet or raise.
 *
 * On the river a hand has a made strength and each action a value. Before the river it has an
 * equity against the other range instead (`hand.equity`), and `strength` and `values` are null.
 *
 * @param {number[]} [dealt] The cards dealt after the spot's own board, in order, as card numbers.
 * @returns {import('../explain/river.js').Decision}
 */
export function decisionAt(fs, solution, nodes, id, dealt = []) {
  const { spot, solver } = solution;
  const node = nodes[id];
  if (node.kind !== 'decision') return null;
  const me = node.seat === 'oop' ? 0 : 1;
  const board = [...spot.board, ...dealt.slice(0, node.round)];
  if (board.length !== spot.board.length + node.round) return null;
  // The solver may keep one board for several that mirror each other: `stored[h]` is the hand a real one plays as
  const found = spot.resolveBoard(board);
  const at = found.board; const stored = found.combos;
  const river = board.length === 5;
  const view = solution.strategyAt(id, at);
  const mineStored = solution.reachAt(id, at, me);
  const hisStored = solution.reachAt(id, at, 1 - me);
  const cardsOf = (combo) => [fs.COMBO_CARDS[2 * combo], fs.COMBO_CARDS[2 * combo + 1]];
  const onBoard = new Set(board);
  const mine = new Float64Array(fs.COMBOS); const his = new Float64Array(fs.COMBOS);
  for (let c = 0; c < fs.COMBOS; c++) { const [a, b] = cardsOf(c); if (onBoard.has(a) || onBoard.has(b)) continue; mine[c] = mineStored[stored[c]]; his[c] = hisStored[stored[c]]; }
  const made = (combo) => fs.evaluateCards([...board, ...cardsOf(combo)]);

  // His reach that a hand can face: all of it but the combinations sharing one of its cards
  const perCard = new Float64Array(52);
  let all = 0;
  for (let c = 0; c < fs.COMBOS; c++) if (his[c] > 0) { all += his[c]; const [a, b] = cardsOf(c); perCard[a] += his[c]; perCard[b] += his[c]; }
  const facing = (combo) => { const [a, b] = cardsOf(combo); return all - perCard[a] - perCard[b] + his[combo]; };

  const mineIn = node.invested[me];
  const hisIn = node.invested[1 - me];
  const actions = node.edges.map((edge, k) => ({ kind: edge.kind, label: edge.label, add: edge.kind === 'fold' || edge.kind === 'check' ? 0 : edge.to - mineIn, child: edge.child }));
  // What each action is worth to each hand, in chips: take it, then play the best reply to his solved
  // strategy. (The solver's own values have the hand follow its solved strategy afterwards, which for an
  // action the hand never takes is untrained and means nothing.) River only for now.
  let values = null;
  if (river) values = evaluator(fs, solution, nodes)(frameAt(fs, solution, nodes, id, dealt), 'best');
  const equity = river ? null : [equityVs(fs, board, mine, his), equityVs(fs, board, his, mine)];
  const row = new Map(); view.combos.forEach((combo, i) => row.set(combo, i));
  const n = view.actions.length;
  const hands = [];
  for (let combo = 0; combo < fs.COMBOS; combo++) {
    if (!(mine[combo] > 1e-6) || !row.has(stored[combo])) continue;
    const i = row.get(stored[combo]);
    const mass = facing(combo);
    const strength = made(combo);
    hands.push({ id: combo, name: fs.formatCombo(combo), cards: cardsOf(combo), weight: mine[combo], strength: river ? strength : null, category: fs.categoryOf(strength), equity: equity ? equity[0][combo] : undefined,
      strategy: Array.from({ length: n }, (_, a) => view.probs[i * n + a]), values: values && mass > 0 ? values.map((v) => v[combo]) : null });
  }
  // His range here, and how each of his hands answers each bet or raise
  const answers = node.edges.map((edge) => {
    const child = nodes[edge.child];
    if (child.kind !== 'decision') return null;
    const reply = solution.strategyAt(edge.child, at);
    const fold = reply.actions.findIndex((label) => label === 'fold');
    const passive = reply.actions.findIndex((label) => label === 'check');
    const call = reply.actions.findIndex((label) => label === 'call');
    const m = reply.actions.length;
    const byCombo = new Map();
    reply.combos.forEach((combo, i) => {
      const p = (k) => (k >= 0 ? reply.probs[i * m + k] : 0);
      // what he does next: fold, check behind, call, or put more in (a bet after a check, or a raise)
      byCombo.set(combo, { fold: p(fold), check: p(passive), call: p(call), more: Math.max(0, 1 - p(fold) - p(passive) - p(call)) });
    });
    return byCombo;
  });
  const villain = [];
  for (let c = 0; c < fs.COMBOS; c++) {
    if (!(his[c] > 1e-6)) continue;
    villain.push({ id: c, name: fs.formatCombo(c), cards: cardsOf(c), weight: his[c], strength: river ? made(c) : null, category: fs.categoryOf(made(c)), equity: equity ? equity[1][c] : undefined, answers: answers.map((map) => map?.get(stored[c]) ?? null) });
  }
  return { street: ['flop', 'turn', 'river'][board.length - 3], board: [...board], boardText: fs.formatCards(board), categories: [...fs.CATEGORY_NAMES], seat: node.seat, pot: node.pot, toCall: hisIn - mineIn, invested: mineIn, actions, hands, villain };
}
