/**
 * Warp: the river as a game between two strength curves that you draw.
 *
 * Every card of both players sits on one axis, its strength; a range is a curve of how much of
 * it sits at each level. A card beats the levels below it and loses to those above, so one
 * player's equity curve fixes the other's. The game (any bets and raises, the stacks) is solved
 * by iteration (CFR+) in a few milliseconds. No real cards: nothing is removed from his range
 * by what you hold.
 */

/** Builds the betting tree from one decision on. Amounts are in chips. */
export function buildTree({ pot, toCall = 0, stack, invested = 0, rootActions = null, checkCloses = false, menu, maxRaises = 4 }) {
  const { bet: fractions = [0.33, 0.75, 1.5], raise: multiple = 2.5, addAllIn = 1.5, forceAllIn = 0.15 } = menu ?? {};
  const nodes = [];
  // `wager`: each player's total on this street; `left`: chips behind; `dead`: everything already in the pot
  const make = (state, depth, given) => {
    const { actor, wager, left, raises } = state;
    const total = state.dead + state.added[0] + state.added[1];
    const owed = wager[1 - actor] - wager[actor];
    const node = { player: actor, actions: [], children: [], index: nodes.length, wager: [...wager] };
    nodes.push(node);
    const terminal = (kind, added, folder = -1) => ({ terminal: kind, added: [...added], folder, dead: state.dead });
    const child = (add, type) => {
      const added = [...state.added]; added[actor] += add;
      const w = [...wager]; w[actor] += add;
      const l = [...left]; l[actor] -= add;
      const next = { actor: 1 - actor, wager: w, left: l, added, dead: state.dead, raises: type === 'raise' ? raises + 1 : raises, acted: state.acted + 1 };
      if (type === 'call') return terminal('showdown', added);
      if (type === 'check') return state.acted >= 1 ? terminal('showdown', added) : make(next, depth + 1);
      return make(next, depth + 1);
    };
    const push = (type, add) => { node.actions.push({ type, add }); node.children.push(type === 'fold' ? terminal('fold', state.added, actor) : child(add, type === 'bet' || type === 'allin' ? 'raise' : type)); };
    if (given) {
      for (const a of given) {
        if (a.type === 'fold') push('fold', 0);
        else if (a.type === 'check') push('check', 0);
        else if (a.type === 'call') push('call', Math.min(owed, left[actor]));
        else push('raise', Math.min(a.to - wager[actor], left[actor]));
      }
      return node;
    }
    if (owed > 0) {
      push('fold', 0);
      push('call', Math.min(owed, left[actor]));
      const room = left[actor] - owed;
      if (room > 1e-9 && left[1 - actor] > 1e-9 && raises < maxRaises) {
        const sizes = new Set();
        const potAfterCall = total + owed;
        let to = multiple * wager[1 - actor];
        let add = Math.min(to - wager[actor], left[actor]);
        // A raise that would leave too little behind is all-in instead
        if (left[actor] - add <= forceAllIn * (potAfterCall + 2 * (add - owed))) add = left[actor];
        sizes.add(Math.round(add * 100) / 100);
        if (room <= addAllIn * potAfterCall) sizes.add(Math.round(left[actor] * 100) / 100);
        for (const s of [...sizes].sort((x, y) => x - y)) push('raise', s);
      }
      return node;
    }
    push('check', 0);
    if (left[actor] > 1e-9 && left[1 - actor] > 1e-9) {
      const sizes = new Set();
      for (const f of fractions) {
        let add = Math.min(f * total, left[actor]);
        if (left[actor] - add <= forceAllIn * (total + 2 * add)) add = left[actor];
        sizes.add(Math.round(add * 100) / 100);
      }
      if (left[actor] <= addAllIn * total) sizes.add(Math.round(left[actor] * 100) / 100);
      for (const s of [...sizes].sort((x, y) => x - y)) push('raise', s);
    }
    return node;
  };
  // Player 0 is the one to act. Both started the street with the same stack.
  const root = make({ actor: 0, wager: [invested, invested + toCall], left: [stack, stack - toCall], added: [0, 0], dead: pot, raises: toCall > 0 ? 1 : 0, acted: checkCloses ? 1 : 0 }, 0, rootActions);
  return { root, nodes };
}

/**
 * Solves the game for two curves on common levels (index 0 the weakest).
 *
 * @param {Object} input
 * @param {Float64Array} input.first Mass per level of the player to act.
 * @param {Float64Array} input.second Mass per level of the other player.
 * @param {{ root: Object, nodes: Object[] }} input.tree From `buildTree`.
 * @param {number} [input.iterations]
 * @returns {Float64Array[]} The first player's profile at the root: `[action][level]`. Its `at(node)`
 *   gives the profile of the player to act at any node of the tree.
 */
export function solveCurves({ first, second, tree, iterations = 400 }) {
  const n = first.length;
  const start = [first, second];
  const regret = tree.nodes.map((node) => node.actions.map(() => new Float64Array(n)));
  const average = tree.nodes.map((node) => node.actions.map(() => new Float64Array(n)));
  const strategyOf = (node) => {
    const r = regret[node.index];
    const k = r.length;
    const out = r.map(() => new Float64Array(n));
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let a = 0; a < k; a++) sum += r[a][i];
      for (let a = 0; a < k; a++) out[a][i] = sum > 0 ? r[a][i] / sum : 1 / k;
    }
    return out;
  };
  // What each level of `player` gets at a terminal, against the other's reach per level
  const settle = (node, player, reach) => {
    const out = new Float64Array(n);
    const mine = node.added[player];
    const his = node.added[1 - player];
    let all = 0;
    for (let j = 0; j < n; j++) all += reach[j];
    if (node.terminal === 'fold') {
      const value = node.folder === player ? -mine : node.dead + his;
      for (let i = 0; i < n; i++) out[i] = value * all;
      return out;
    }
    const win = node.dead + his;
    const tie = (node.dead + mine + his) / 2 - mine;
    let below = 0;
    for (let i = 0; i < n; i++) {
      out[i] = win * below + tie * reach[i] - mine * (all - below - reach[i]);
      below += reach[i];
    }
    return out;
  };
  const walk = (node, player, own, other, weight) => {
    if (node.terminal) return settle(node, player, other);
    const sigma = strategyOf(node);
    const k = node.actions.length;
    if (node.player === player) {
      const utils = [];
      const value = new Float64Array(n);
      for (let a = 0; a < k; a++) {
        const next = new Float64Array(n);
        for (let i = 0; i < n; i++) next[i] = own[i] * sigma[a][i];
        utils.push(walk(node.children[a], player, next, other, weight));
        for (let i = 0; i < n; i++) value[i] += sigma[a][i] * utils[a][i];
      }
      const r = regret[node.index];
      const avg = average[node.index];
      for (let a = 0; a < k; a++) for (let i = 0; i < n; i++) {
        r[a][i] = Math.max(0, r[a][i] + utils[a][i] - value[i]);
        avg[a][i] += weight * own[i] * sigma[a][i];
      }
      return value;
    }
    const value = new Float64Array(n);
    for (let a = 0; a < k; a++) {
      const next = new Float64Array(n);
      for (let j = 0; j < n; j++) next[j] = other[j] * sigma[a][j];
      const u = walk(node.children[a], player, own, next, weight);
      for (let i = 0; i < n; i++) value[i] += u[i];
    }
    return value;
  };
  for (let t = 1; t <= iterations; t++) {
    for (const player of [0, 1]) walk(tree.root, player, start[player], start[1 - player], t);
  }
  // The average strategy of every node; where a node was never reached, the last strategy
  const profileOf = (node) => {
    const avg = average[node.index];
    const last = strategyOf(node);
    return avg.map((row, a) => row.map((x, i) => { let sum = 0; for (const other of avg) sum += other[i]; return sum > 1e-12 ? x / sum : last[a][i]; }));
  };
  const out = profileOf(tree.root);
  out.at = profileOf;
  return out;
}


/**
 * Two ranges from one equity curve. `equities[i]` is the equity of the first player's i-th card
 * (weakest first, equal weights) against the second player's range: the share of his range
 * below it. His cards fill the gaps, so his curve follows from this one.
 *
 * @param {number[]} equities Rising, each between 0 and 1.
 * @returns {{ first: Float64Array, second: Float64Array, owner: Int8Array, equity: Float64Array }}
 *   Mass per level for each player, who holds each level (0 or 1), and each level's equity
 *   against the other range.
 */
export function levelsFromCurve(equities) {
  const n = equities.length;
  const sorted = [...equities].map((e) => Math.min(1, Math.max(0, e))).sort((a, b) => a - b);
  const count = 2 * n + 1;
  const first = new Float64Array(count);
  const second = new Float64Array(count);
  const owner = new Int8Array(count);
  const equity = new Float64Array(count);
  for (let k = 0; k <= n; k++) {
    // his block under the k-th of our cards, then that card
    const low = k === 0 ? 0 : sorted[k - 1];
    const high = k === n ? 1 : sorted[k];
    second[2 * k] = Math.max(0, high - low);
    owner[2 * k] = 1;
    equity[2 * k] = k / n;
    if (k < n) { first[2 * k + 1] = 1 / n; owner[2 * k + 1] = 0; equity[2 * k + 1] = sorted[k]; }
  }
  return { first, second, owner, equity };
}
