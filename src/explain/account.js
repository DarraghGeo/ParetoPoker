/**
 * Accounting for one decision of a solved spot, on any street.
 *
 * Everything here is arithmetic on the solution, with no judgement in it: what each action is
 * worth to each hand, and that worth split three ways, each split adding back up to the whole:
 *
 *   by what he does next   (he folds / calls / raises; he checks / bets)
 *   by what he holds       (any grouping of his hands)
 *   by the card that comes (when the action ends the street)
 *
 * The splits are exact because a hand's value is a sum over his hands and over the cards to
 * come; `research/proof/identities.mjs` checks every one of them on every hand of a battery of
 * spots. Values are chips, measured from splitting the pot the spot started with: winning that
 * pot outright with nothing more put in is +pot/2.
 */

/** The decision's frame: the board as the solver stores it, both ranges as they arrive, and the scale of its values. */
export function frameAt(fs, solution, nodes, id, dealt = []) {
  const { spot, solver } = solution;
  const node = nodes[id];
  if (!node || node.kind !== 'decision') return null;
  const me = node.seat === 'oop' ? 0 : 1;
  const board = [...spot.board, ...dealt.slice(0, node.round)];
  if (board.length !== spot.board.length + node.round) return null;
  const found = spot.resolveBoard(board);
  const at = found.board; const stored = found.combos;
  const ctx = solver.ctx;
  const mineS = solution.reachAt(id, at, me);
  const hisS = solution.reachAt(id, at, 1 - me);
  const A = (c) => fs.COMBO_CARDS[2 * c]; const B = (c) => fs.COMBO_CARDS[2 * c + 1];
  const taken = new Uint8Array(52); for (const c of board) taken[c] = 1;
  // both ranges by real combination
  const mine = new Float64Array(fs.COMBOS); const his = new Float64Array(fs.COMBOS);
  for (let c = 0; c < fs.COMBOS; c++) { if (taken[A(c)] || taken[B(c)]) continue; mine[c] = mineS[stored[c]]; his[c] = hisS[stored[c]]; }
  // how much of his range a hand can face: all of it but what shares a card with it
  const perCard = new Float64Array(52); let all = 0;
  for (let c = 0; c < fs.COMBOS; c++) if (his[c] > 0) { all += his[c]; perCard[A(c)] += his[c]; perCard[B(c)] += his[c]; }
  const mass = new Float64Array(fs.COMBOS);
  for (let c = 0; c < fs.COMBOS; c++) if (!taken[A(c)] && !taken[B(c)]) mass[c] = all - perCard[A(c)] - perCard[B(c)] + his[c];
  const live = liveOf(ctx, node.round, at, me);
  return { fs, solution, solver, nodes, node, id, me, round: node.round, board, at, stored, mine, his, mineS, hisS, mass, live, scale: ctx.runoutWeight[node.round], taken };
}
const liveOf = (ctx, round, at, player) => { const slot = (ctx.active.roundBase[round] + at) * 2 + player; return ctx.active.list.subarray(ctx.active.start[slot], ctx.active.start[slot] + ctx.active.count[slot]); };

/** Raw values of a node under this frame for a given reach of his (stored frame), read back by real combination, in chips. */
function chips(f, child, hisS) {
  const raw = f.solver.valuesAt(child, f.at, f.me, f.mineS, hisS, f.live, f.live.length);
  const out = new Float64Array(f.fs.COMBOS).fill(NaN);
  for (let c = 0; c < f.fs.COMBOS; c++) if (f.mine[c] > 0 && f.mass[c] > 0) out[c] = raw[f.stored[c]] / (f.mass[c] * f.scale);
  return out;
}

/** What each action is worth to each hand: `values[a][combo]`, chips. */
export function actionValues(f) {
  return f.node.edges.map((edge) => chips(f, edge.child, f.hisS));
}

/** His strategy at one of his decisions on this board, by real combination: `probs[k][combo]`. */
function hisStrategy(f, id) {
  const view = f.solution.strategyAt(id, f.at);
  const n = view.actions.length;
  const row = new Int32Array(f.fs.COMBOS).fill(-1); view.combos.forEach((combo, i) => { row[combo] = i; });
  return f.nodes[id].edges.map((_, k) => { const p = new Float64Array(f.fs.COMBOS); for (let c = 0; c < f.fs.COMBOS; c++) { const i = row[f.stored[c]]; if (i >= 0 && f.his[c] > 0) p[c] = view.probs[i * n + k]; } return p; });
}
const toStored = (f, real) => { const out = new Float64Array(f.fs.COMBOS); for (let c = 0; c < f.fs.COMBOS; c++) if (real[c] > 0) out[f.stored[c]] = real[c]; return out; };

/**
 * An action split by what he does next. For each of his replies: how often he makes it against
 * each hand (`share[combo]`, of the hands that hand can face) and what it adds to the action's
 * value (`value[combo]`, chips). The values add up to the action's. Null when the action does
 * not hand the move to him on this street.
 */
export function byReply(f, a) {
  const child = f.nodes[f.node.edges[a].child];
  if (child.kind !== 'decision') return null;
  const probs = hisStrategy(f, child.id);
  const A = (c) => f.fs.COMBO_CARDS[2 * c]; const B = (c) => f.fs.COMBO_CARDS[2 * c + 1];
  return child.edges.map((edge, k) => {
    const reach = new Float64Array(f.fs.COMBOS); const perCard = new Float64Array(52); let all = 0;
    for (let c = 0; c < f.fs.COMBOS; c++) { const w = f.his[c] * probs[k][c]; if (w > 0) { reach[c] = w; all += w; perCard[A(c)] += w; perCard[B(c)] += w; } }
    const share = new Float64Array(f.fs.COMBOS).fill(NaN);
    for (let c = 0; c < f.fs.COMBOS; c++) if (f.mine[c] > 0 && f.mass[c] > 0) share[c] = (all - perCard[A(c)] - perCard[B(c)] + reach[c]) / f.mass[c];
    return { kind: edge.kind, label: edge.label, child: edge.child, share, value: chips(f, edge.child, toStored(f, reach)) };
  });
}

/**
 * An action split by what he holds. `groupOf(combo)` names the group of each of his hands (any
 * string; null leaves a hand out, and then the parts no longer add up to the whole). Returns,
 * per group, `share[combo]` (how much of what the hand faces is that group) and `value[combo]`.
 */
export function byHolding(f, a, groupOf) {
  const groups = new Map();
  for (let c = 0; c < f.fs.COMBOS; c++) { if (!(f.his[c] > 0)) continue; const g = groupOf(c); if (g == null) continue; if (!groups.has(g)) groups.set(g, new Float64Array(f.fs.COMBOS)); groups.get(g)[c] = f.his[c]; }
  const A = (c) => f.fs.COMBO_CARDS[2 * c]; const B = (c) => f.fs.COMBO_CARDS[2 * c + 1];
  const out = new Map();
  for (const [g, reach] of groups) {
    const perCard = new Float64Array(52); let all = 0;
    for (let c = 0; c < f.fs.COMBOS; c++) if (reach[c] > 0) { all += reach[c]; perCard[A(c)] += reach[c]; perCard[B(c)] += reach[c]; }
    const share = new Float64Array(f.fs.COMBOS).fill(NaN);
    for (let c = 0; c < f.fs.COMBOS; c++) if (f.mine[c] > 0 && f.mass[c] > 0) share[c] = (all - perCard[A(c)] - perCard[B(c)] + reach[c]) / f.mass[c];
    out.set(g, { share, value: chips(f, f.node.edges[a].child, toStored(f, reach)) });
  }
  return out;
}

/**
 * An action that ends the street, split by the card that comes. For each card: `value[combo]`,
 * what that card adds to the action's value (chips; NaN where the hand holds the card), and
 * `then[combo]`, what the hand is worth once that card has come (chips, given the card). Null
 * when the action does not lead to a deal.
 */
export function byCard(f, a) {
  const chance = f.nodes[f.node.edges[a].child];
  if (chance.kind !== 'chance') return null;
  const { fs, solution, solver } = f; const spot = solution.spot; const ctx = solver.ctx;
  const next = chance.edges[0].child; const round = f.round + 1;
  const terminal = f.nodes[next].kind !== 'decision';
  const A = (c) => fs.COMBO_CARDS[2 * c]; const B = (c) => fs.COMBO_CARDS[2 * c + 1];
  const cards = [];
  for (let x = 0; x < 52; x++) {
    if (f.taken[x]) continue;
    const found = spot.resolveBoard([...f.board, x]);
    const mineS = new Float64Array(fs.COMBOS); const hisS = new Float64Array(fs.COMBOS);
    for (let c = 0; c < fs.COMBOS; c++) { if (A(c) === x || B(c) === x || f.taken[A(c)] || f.taken[B(c)]) continue; mineS[found.combos[c]] = f.mine[c]; hisS[found.combos[c]] = f.his[c]; }
    const live = liveOf(ctx, round, found.board, f.me);
    const raw = solver.valuesAt(next, found.board, f.me, mineS, hisS, live, live.length);
    // what he can still hold against each hand once the card is out
    const perCard = new Float64Array(52); let all = 0;
    for (let c = 0; c < fs.COMBOS; c++) if (f.his[c] > 0 && A(c) !== x && B(c) !== x) { all += f.his[c]; perCard[A(c)] += f.his[c]; perCard[B(c)] += f.his[c]; }
    const value = new Float64Array(fs.COMBOS).fill(NaN); const then = new Float64Array(fs.COMBOS).fill(NaN);
    for (let c = 0; c < fs.COMBOS; c++) {
      if (!(f.mine[c] > 0) || !(f.mass[c] > 0) || A(c) === x || B(c) === x) continue;
      const left = all - perCard[A(c)] - perCard[B(c)] + (f.his[c] > 0 ? f.his[c] : 0);
      value[c] = raw[found.combos[c]] / (f.mass[c] * f.scale);
      then[c] = left > 0 ? raw[found.combos[c]] / (left * ctx.runoutWeight[round]) : NaN;
    }
    cards.push({ card: x, value, then, terminal });
  }
  return cards;
}
