/**
 * Reads a spot solved by poker-flopsolve into the plain shape the explainer takes.
 *
 * The solver module is passed in (`fs`), so the same code runs in Node and in a browser worker.
 * River spots only for now: one board, no cards to come.
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
    nodes.push({ id, kind: kinds[tree.kind[id]], seat: tree.player[id] < 0 ? null : tree.player[id] === 0 ? 'oop' : 'ip', pot: tree.pot[id] / chipScale, edges, parent: -1, via: -1, invested: [0, 0] });
  }
  // What each player has put in on the way to every node
  const walk = (id) => {
    const node = nodes[id];
    node.edges.forEach((edge, k) => {
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
 * Everything about one decision: who acts, the price, each hand's strategy and what each action
 * is worth to it, and the other player's range with his answer to each bet or raise.
 *
 * @returns {import('../explain/river.js').Decision}
 */
export function decisionAt(fs, solution, nodes, id) {
  const { spot, solver } = solution;
  const node = nodes[id];
  if (node.kind !== 'decision') return null;
  const me = node.seat === 'oop' ? 0 : 1;
  const board = spot.board;
  const view = solution.strategyAt(id, 0);
  const mine = solution.reachAt(id, 0, me);
  const his = solution.reachAt(id, 0, 1 - me);
  const cardsOf = (combo) => [fs.COMBO_CARDS[2 * combo], fs.COMBO_CARDS[2 * combo + 1]];
  const strength = (combo) => fs.evaluateCards([...board, ...cardsOf(combo)]);
  const active = solver.ctx.active;
  const slot = (active.roundBase[0] + 0) * 2 + me;
  const live = active.list.subarray(active.start[slot], active.start[slot] + active.count[slot]);

  // His reach that a hand can face: all of it but the combinations sharing one of its cards
  const perCard = new Float64Array(52);
  let all = 0;
  for (let c = 0; c < fs.COMBOS; c++) if (his[c] > 0) { all += his[c]; const [a, b] = cardsOf(c); perCard[a] += his[c]; perCard[b] += his[c]; }
  const facing = (combo) => { const [a, b] = cardsOf(combo); return all - perCard[a] - perCard[b] + his[combo]; };

  const mineIn = node.invested[me];
  const hisIn = node.invested[1 - me];
  const actions = node.edges.map((edge, k) => ({ kind: edge.kind, label: view.actions[k], add: edge.kind === 'fold' || edge.kind === 'check' ? 0 : edge.to - mineIn, child: edge.child }));
  // Values are sums over his reach, in chips: divide by what the hand can face
  const values = node.edges.map((edge) => solver.valuesAt(edge.child, 0, me, mine, his, live, live.length));
  const n = view.actions.length;
  const hands = [];
  view.combos.forEach((combo, i) => {
    if (!(mine[combo] > 1e-6)) return;
    const mass = facing(combo);
    hands.push({ id: combo, name: fs.formatCombo(combo), cards: cardsOf(combo), weight: mine[combo], strength: strength(combo),
      strategy: Array.from({ length: n }, (_, a) => view.probs[i * n + a]), values: mass > 0 ? values.map((v) => v[combo] / mass) : null });
  });
  // His range here, and how each of his hands answers each bet or raise
  const answers = node.edges.map((edge) => {
    const child = nodes[edge.child];
    if (child.kind !== 'decision') return null;
    const reply = solution.strategyAt(edge.child, 0);
    const fold = reply.actions.findIndex((label) => label === 'fold');
    const passive = reply.actions.findIndex((label) => label === 'check');
    const m = reply.actions.length;
    const byCombo = new Map();
    reply.combos.forEach((combo, i) => { byCombo.set(combo, { fold: fold >= 0 ? reply.probs[i * m + fold] : 0, check: passive >= 0 ? reply.probs[i * m + passive] : 0 }); });
    return byCombo;
  });
  const villain = [];
  for (let c = 0; c < fs.COMBOS; c++) {
    if (!(his[c] > 1e-6)) continue;
    villain.push({ id: c, name: fs.formatCombo(c), cards: cardsOf(c), weight: his[c], strength: strength(c), answers: answers.map((map) => map?.get(c) ?? null) });
  }
  return { street: 'river', board: [...board], boardText: fs.formatCards(board), seat: node.seat, pot: node.pot, toCall: hisIn - mineIn, invested: mineIn, actions, hands, villain };
}
