import { COMBO_A, COMBO_B, NUM_COMBOS } from './cards.js';

/**
 * The river as a game between two strength curves.
 *
 * Every hand of both ranges is placed on one axis, its made-hand strength; a range is then a
 * curve: how much of it sits at each level. A hand wins against the lower levels, ties its own
 * and loses to the higher ones, whatever its cards (card removal is left out). This is the game
 * of von Neumann, and of Ferguson & Ferguson's section 5.3, with any two curves, any menu of
 * bets and raises and the stacks. One bet and no raise has the closed form in `derived.js`;
 * past that the indifference conditions have no closed form and are solved here by iteration
 * (CFR+), which takes milliseconds because a hand's worth against a range of levels is a
 * running sum.
 *
 * What comes out is a profile: for every level, how often it takes each action. Hands of one
 * level are interchangeable (measured: TUNINGS.md, the interchange tests), so the profile maps
 * onto hands by level and nothing else is needed.
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
 * The profile for a river decision, per combo: `strategy[action][combo]`, in the order of
 * `actions`.
 *
 * @param {Object} input
 * @param {import('./Equity.js').Equity} input.equity
 * @param {number[]} input.board Five card ids.
 * @param {Float64Array} input.hero Weights per combo of the player to act.
 * @param {Float64Array} input.villain
 * @param {import('./ParetoEngine.js').Spot} input.spot `pot` (with any bet in it), `stack`, `toCall`, `invested`.
 * @param {{ type: string, to?: number }[]} input.actions
 * @param {boolean} [input.checkCloses] A check here ends the betting (in position after a check).
 * @param {{ bet?: number[], raise?: number }} [input.menu] The bets (in pots) and the raise (a
 *   multiple of the bet) taken to be available later in the hand.
 * @param {number} [input.iterations]
 */
export function riverProfile({ equity, board, hero, villain, spot, actions, checkCloses = false, menu = null, iterations = 400 }) {
  const values = equity.madeValues(board);
  const levels = [...new Set(Array.from({ length: NUM_COMBOS }, (_, i) => i).filter((i) => (hero[i] > 1e-9 || villain[i] > 1e-9) && values[i] >= 0).map((i) => values[i]))].sort((a, b) => a - b);
  const levelOf = new Map(levels.map((v, k) => [v, k]));
  const first = new Float64Array(levels.length);
  const second = new Float64Array(levels.length);
  for (let i = 0; i < NUM_COMBOS; i++) {
    if (values[i] < 0) continue;
    if (hero[i] > 1e-9) first[levelOf.get(values[i])] += hero[i];
    if (villain[i] > 1e-9) second[levelOf.get(values[i])] += villain[i];
  }
  const toCall = spot.toCall ?? 0;
  const invested = spot.invested ?? 0;
  // The menu, read off this decision where it shows: his bets are taken to be like ours
  const guessed = { ...(menu ?? {}) };
  const sized = actions.filter((a) => a.to != null);
  if (!menu?.bet && toCall === 0 && sized.length) guessed.bet = sized.map((a) => (a.to - invested) / spot.pot);
  if (!menu?.raise && toCall > 0 && sized.length) guessed.raise = Math.max(1.5, sized[0].to / (invested + toCall));
  const tree = buildTree({ pot: spot.pot, toCall, stack: spot.stack ?? Infinity, invested, rootActions: actions, checkCloses, menu: guessed });
  const profile = solveCurves({ first, second, tree, iterations });
  const strategy = actions.map(() => new Float64Array(NUM_COMBOS));
  const passive = actions.findIndex((a) => a.type === (toCall > 0 ? 'fold' : 'check'));
  for (let i = 0; i < NUM_COMBOS; i++) {
    const level = values[i] >= 0 ? levelOf.get(values[i]) : undefined;
    if (level === undefined) { strategy[passive][i] = 1; continue; }
    actions.forEach((_, a) => { strategy[a][i] = profile[a][level]; });
  }
  return strategy;
}

/**
 * The same game hand by hand, with card removal: two hands that share a card are never dealt
 * together, so a hand's worth depends on which of his hands its own cards rule out. With this
 * the river is solved as it is played; without it (the curves) hands of one strength are one.
 *
 * @param {Object} input
 * @param {{ ids: number[], values: Int32Array|number[], weights: number[] }} input.first Combo ids, strengths and weights of the player to act.
 * @param {{ ids: number[], values: Int32Array|number[], weights: number[] }} input.second
 * @param {{ root: Object, nodes: Object[] }} input.tree
 * @param {number} [input.iterations]
 * @returns {{ at: (node: Object) => Float64Array[] }} `at(node)[action][hand index of the player to act]`.
 */
export function solveHands({ first, second, tree, iterations = 300 }) {
  const players = [first, second];
  const count = players.map((p) => p.ids.length);
  const order = players.map((p) => p.ids.map((_, i) => i).sort((x, y) => p.values[x] - p.values[y]));
  // The same combo in the other player's range, if he holds it
  const twin = players.map((p, k) => { const where = new Map(players[1 - k].ids.map((id, j) => [id, j])); return p.ids.map((id) => where.get(id) ?? -1); });
  const regret = tree.nodes.map((node) => node.actions.map(() => new Float64Array(count[node.player])));
  const average = tree.nodes.map((node) => node.actions.map(() => new Float64Array(count[node.player])));
  const matched = (r, n) => {
    const k = r.length;
    const out = r.map(() => new Float64Array(n));
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let a = 0; a < k; a++) sum += r[a][i];
      for (let a = 0; a < k; a++) out[a][i] = sum > 0 ? r[a][i] / sum : 1 / k;
    }
    return out;
  };
  const settle = (node, player, reach) => {
    const me = players[player];
    const him = players[1 - player];
    const n = count[player];
    const out = new Float64Array(n);
    const mine = node.added[player];
    const his = node.added[1 - player];
    // His reach in all and per card, for the hands a card rules out
    let all = 0;
    const perCard = new Float64Array(52);
    for (let j = 0; j < reach.length; j++) { all += reach[j]; perCard[COMBO_A[him.ids[j]]] += reach[j]; perCard[COMBO_B[him.ids[j]]] += reach[j]; }
    const valid = (i) => { const id = me.ids[i]; const t = twin[player][i]; return all - perCard[COMBO_A[id]] - perCard[COMBO_B[id]] + (t >= 0 ? reach[t] : 0); };
    if (node.terminal === 'fold') {
      const value = node.folder === player ? -mine : node.dead + his;
      for (let i = 0; i < n; i++) out[i] = value * valid(i);
      return out;
    }
    const win = node.dead + his;
    const tie = (node.dead + mine + his) / 2 - mine;
    // Sweep both ranges by strength: what of his is below, and what is at or below, each hand
    const mineOrder = order[player];
    const hisOrder = order[1 - player];
    let low = 0; let lowSum = 0; const lowCard = new Float64Array(52);
    let high = 0; let highSum = 0; const highCard = new Float64Array(52);
    for (const i of mineOrder) {
      const v = me.values[i];
      while (low < hisOrder.length && him.values[hisOrder[low]] < v) { const j = hisOrder[low++]; lowSum += reach[j]; lowCard[COMBO_A[him.ids[j]]] += reach[j]; lowCard[COMBO_B[him.ids[j]]] += reach[j]; }
      while (high < hisOrder.length && him.values[hisOrder[high]] <= v) { const j = hisOrder[high++]; highSum += reach[j]; highCard[COMBO_A[him.ids[j]]] += reach[j]; highCard[COMBO_B[him.ids[j]]] += reach[j]; }
      const id = me.ids[i];
      const a = COMBO_A[id];
      const b = COMBO_B[id];
      const same = twin[player][i] >= 0 ? reach[twin[player][i]] : 0;
      const below = lowSum - lowCard[a] - lowCard[b];
      const atOrBelow = highSum - highCard[a] - highCard[b] + same;
      const total = all - perCard[a] - perCard[b] + same;
      out[i] = win * below + tie * (atOrBelow - below) - mine * (total - atOrBelow);
    }
    return out;
  };
  const walk = (node, player, own, other, weight) => {
    if (node.terminal) return settle(node, player, other);
    const k = node.actions.length;
    const n = count[player];
    const value = new Float64Array(n);
    if (node.player === player) {
      const reg = regret[node.index];
      const sigma = matched(reg, n);
      const utils = [];
      for (let a = 0; a < k; a++) {
        const next = new Float64Array(n);
        for (let i = 0; i < n; i++) next[i] = own[i] * sigma[a][i];
        utils.push(walk(node.children[a], player, next, other, weight));
        for (let i = 0; i < n; i++) value[i] += sigma[a][i] * utils[a][i];
      }
      const avg = average[node.index];
      for (let a = 0; a < k; a++) for (let i = 0; i < n; i++) {
        reg[a][i] = Math.max(0, reg[a][i] + utils[a][i] - value[i]);
        avg[a][i] += weight * own[i] * sigma[a][i];
      }
      return value;
    }
    const m = count[1 - player];
    const sigma = matched(regret[node.index], m);
    for (let a = 0; a < k; a++) {
      const next = new Float64Array(m);
      for (let j = 0; j < m; j++) next[j] = other[j] * sigma[a][j];
      const u = walk(node.children[a], player, own, next, weight);
      for (let i = 0; i < n; i++) value[i] += u[i];
    }
    return value;
  };
  const start = players.map((p) => Float64Array.from(p.weights));
  for (let t = 1; t <= iterations; t++) for (const player of [0, 1]) walk(tree.root, player, start[player], start[1 - player], t);
  return {
    at(node) {
      const n = count[node.player];
      const avg = average[node.index];
      const last = matched(regret[node.index], n);
      return avg.map((row, a) => Float64Array.from({ length: n }, (_, i) => { let sum = 0; for (const other of avg) sum += other[i]; return sum > 1e-12 ? row[i] / sum : last[a][i]; }));
    },
  };
}

/**
 * A whole river solved once from its first decision: the profile of every decision that follows,
 * for both players. Later decisions are read off it (`at`), so that the answer to a line the
 * other player was not expected to take is still part of one consistent plan.
 *
 * @param {Object} input As `riverProfile`, at the first decision of the street (out of position, nothing bet).
 * @param {boolean} [input.blockers] Count card removal: the river hand by hand (`solveHands`) in place of the two curves.
 */
export function solveRiver({ equity, board, hero, villain, spot, actions, menu = null, iterations = 400, blockers = false }) {
  const values = equity.madeValues(board);
  const levels = [...new Set(Array.from({ length: NUM_COMBOS }, (_, i) => i).filter((i) => (hero[i] > 1e-9 || villain[i] > 1e-9) && values[i] >= 0).map((i) => values[i]))].sort((a, b) => a - b);
  const levelOf = new Map(levels.map((v, k) => [v, k]));
  const first = new Float64Array(levels.length);
  const second = new Float64Array(levels.length);
  for (let i = 0; i < NUM_COMBOS; i++) {
    if (values[i] < 0) continue;
    if (hero[i] > 1e-9) first[levelOf.get(values[i])] += hero[i];
    if (villain[i] > 1e-9) second[levelOf.get(values[i])] += villain[i];
  }
  const guessed = { ...(menu ?? {}) };
  const sized = actions.filter((a) => a.to != null);
  if (!menu?.bet && sized.length) guessed.bet = sized.map((a) => a.to / spot.pot);
  const tree = buildTree({ pot: spot.pot, toCall: 0, stack: spot.stack ?? Infinity, invested: 0, rootActions: actions, menu: guessed });
  // With card removal the game is played hand by hand; without, on the two curves
  const handsOf = (range) => { const ids = []; for (let i = 0; i < NUM_COMBOS; i++) if (range[i] > 1e-9 && values[i] >= 0) ids.push(i); return { ids, values: ids.map((i) => values[i]), weights: ids.map((i) => range[i]) }; };
  const exact = blockers ? { players: [handsOf(hero), handsOf(villain)] } : null;
  if (exact) exact.solved = solveHands({ first: exact.players[0], second: exact.players[1], tree, iterations });
  const solved = exact ? null : solveCurves({ first, second, tree, iterations });
  return {
    /**
     * The profile per combo at a later decision, or null when the tree here has no such
     * decision or offers other actions. `seat`: 0 for the player who acted first on the street.
     */
    at(seat, wagerMine, wagerHis, nodeActions) {
      const close = (x, y) => Math.abs(x - y) <= 0.02 * Math.max(1, Math.abs(y)) + 0.6;
      const node = tree.nodes.find((n) => n.player === seat && close(n.wager[seat], wagerMine) && close(n.wager[1 - seat], wagerHis) && n.actions.length === nodeActions.length
        && n.actions.every((a, k) => (nodeActions[k].to == null ? a.type === nodeActions[k].type : a.type === 'raise' && close(n.wager[seat] + a.add, nodeActions[k].to))));
      if (!node) return null;
      const strategy = nodeActions.map(() => new Float64Array(NUM_COMBOS));
      const passive = nodeActions.findIndex((a) => a.type === 'fold' || a.type === 'check');
      if (exact) {
        const profile = exact.solved.at(node);
        strategy[passive].fill(1);
        exact.players[seat].ids.forEach((id, h) => { nodeActions.forEach((_, a) => { strategy[a][id] = profile[a][h]; }); });
        return strategy;
      }
      const profile = solved.at(node);
      for (let i = 0; i < NUM_COMBOS; i++) {
        const level = values[i] >= 0 ? levelOf.get(values[i]) : undefined;
        if (level === undefined) { strategy[passive][i] = 1; continue; }
        nodeActions.forEach((_, a) => { strategy[a][i] = profile[a][level]; });
      }
      return strategy;
    },
  };
}
