import { COMBO_A, COMBO_B, NUM_COMBOS } from './cards.js';
import { buildTree } from './CurveGame.js';

/**
 * The turn and the river behind it as one game, without card removal.
 *
 * On the turn a hand is its strength on every river card (the coordinate the interchange tests
 * found: TUNINGS.md). The turn is played hand by hand; each river is a curve game (CurveGame.js)
 * between the ranges that reach it, on that river's strength levels. Everything is found
 * together by the same iteration (CFR+), from the two ranges, the stacks and the menu of bets
 * and raises. Nothing is fitted.
 *
 * @param {Object} input
 * @param {import('./Equity.js').Equity} input.equity
 * @param {number[]} input.board Four card ids.
 * @param {Float64Array} input.first Weights per combo of the player first to act (out of position).
 * @param {Float64Array} input.second
 * @param {number} input.pot
 * @param {number} input.stack
 * @param {{ type: string, to?: number }[]} input.actions The first player's options at the start.
 * @param {{ bet?: number[], raise?: number }} [input.menu]
 * @param {number} [input.iterations]
 */
export function solveTurn({ equity, board, first, second, pot, stack, actions, menu = null, iterations = 200, maxRaises = 3 }) {
  const guessed = { ...(menu ?? {}) };
  const sized = actions.filter((a) => a.to != null);
  if (!menu?.bet && sized.length) guessed.bet = sized.map((a) => a.to / pot);
  const tree = buildTree({ pot, stack, rootActions: actions, menu: guessed, maxRaises });
  const ranges = [first, second];
  const hands = ranges.map((range) => { const ids = []; for (let i = 0; i < NUM_COMBOS; i++) if (range[i] > 1e-9 && !board.includes(COMBO_A[i]) && !board.includes(COMBO_B[i])) ids.push(i); return ids; });
  const start = hands.map((ids, p) => Float64Array.from(ids, (i) => ranges[p][i]));
  const count = hands.map((ids) => ids.length);

  // Every river: each hand's strength level there (-1 when it holds the card)
  const rivers = [];
  for (let card = 0; card < 52; card++) {
    if (board.includes(card)) continue;
    const values = equity.madeValues([...board, card]);
    const seen = new Set();
    for (const ids of hands) for (const i of ids) if (COMBO_A[i] !== card && COMBO_B[i] !== card) seen.add(values[i]);
    const order = [...seen].sort((a, b) => a - b);
    const index = new Map(order.map((v, k) => [v, k]));
    rivers.push({ card, levels: order.length, values, index, level: hands.map((ids) => Int16Array.from(ids, (i) => (COMBO_A[i] === card || COMBO_B[i] === card ? -1 : index.get(values[i])))) });
  }
  const chance = 1 / rivers.length;

  // The lines that reach the river, each with its own river tree (the same on every river card)
  const lines = [];
  const visit = (node, path) => {
    node.children.forEach((child, a) => {
      if (!child.terminal) { visit(child, [...path, a]); return; }
      if (child.terminal !== 'showdown') return;
      const riverPot = child.dead + child.added[0] + child.added[1];
      const left = stack - Math.max(child.added[0], child.added[1]);
      const riverTree = buildTree({ pot: riverPot, stack: Math.max(0, left), menu: guessed, maxRaises });
      child.line = lines.length;
      lines.push({ terminal: child, path: [...path, a], tree: riverTree, sunk: child.added,
        regret: rivers.map((r) => riverTree.nodes.map((n) => n.actions.map(() => new Float32Array(r.levels)))),
        average: rivers.map((r) => riverTree.nodes.map((n) => n.actions.map(() => new Float32Array(r.levels)))) });
    });
  };
  visit(tree.root, []);

  const regret = tree.nodes.map((node) => node.actions.map(() => new Float64Array(count[node.player])));
  const average = tree.nodes.map((node) => node.actions.map(() => new Float64Array(count[node.player])));
  const matched = (r, n) => {
    const k = r.length;
    const out = r.map(() => new Float64Array(n));
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let a = 0; a < k; a++) sum += r[a][i];
      if (sum > 0) for (let a = 0; a < k; a++) out[a][i] = r[a][i] / sum;
      else for (let a = 0; a < k; a++) out[a][i] = 1 / k;
    }
    return out;
  };

  // A river terminal: `sunk` is what the player put in on the turn
  const settle = (node, player, reach, n, sunk) => {
    const out = new Float64Array(n);
    const mine = node.added[player] + sunk[player];
    const his = node.added[1 - player] + sunk[1 - player];
    const dead = node.dead - sunk[0] - sunk[1];
    let all = 0;
    for (let j = 0; j < n; j++) all += reach[j];
    if (node.terminal === 'fold') {
      const value = node.folder === player ? -mine : dead + his;
      for (let i = 0; i < n; i++) out[i] = value * all;
      return out;
    }
    const win = dead + his;
    const tie = (dead + mine + his) / 2 - mine;
    let below = 0;
    for (let i = 0; i < n; i++) {
      out[i] = win * below + tie * reach[i] - mine * (all - below - reach[i]);
      below += reach[i];
    }
    return out;
  };
  const walkRiver = (line, r, node, player, own, other, weight) => {
    const n = rivers[r].levels;
    if (node.terminal) return settle(node, player, other, n, line.sunk);
    const reg = line.regret[r][node.index];
    const sigma = matched(reg, n);
    const k = node.actions.length;
    const value = new Float64Array(n);
    if (node.player === player) {
      const utils = [];
      for (let a = 0; a < k; a++) {
        const next = new Float64Array(n);
        for (let i = 0; i < n; i++) next[i] = own[i] * sigma[a][i];
        utils.push(walkRiver(line, r, node.children[a], player, next, other, weight));
        for (let i = 0; i < n; i++) value[i] += sigma[a][i] * utils[a][i];
      }
      const avg = line.average[r][node.index];
      for (let a = 0; a < k; a++) for (let i = 0; i < n; i++) {
        reg[a][i] = Math.max(0, reg[a][i] + utils[a][i] - value[i]);
        avg[a][i] += weight * own[i] * sigma[a][i];
      }
      return value;
    }
    for (let a = 0; a < k; a++) {
      const next = new Float64Array(n);
      for (let j = 0; j < n; j++) next[j] = other[j] * sigma[a][j];
      const u = walkRiver(line, r, node.children[a], player, own, next, weight);
      for (let i = 0; i < n; i++) value[i] += u[i];
    }
    return value;
  };
  const walk = (node, player, own, other, weight) => {
    const n = count[player];
    if (node.terminal === 'fold') {
      let all = 0;
      for (const x of other) all += x;
      const value = node.folder === player ? -node.added[player] : node.dead + node.added[1 - player];
      return new Float64Array(n).fill(value * all);
    }
    if (node.terminal) {
      // The river: every card in turn, the ranges gathered onto that river's levels
      const line = lines[node.line];
      const out = new Float64Array(n);
      for (let r = 0; r < rivers.length; r++) {
        const river = rivers[r];
        const mine = new Float64Array(river.levels);
        const his = new Float64Array(river.levels);
        const lm = river.level[player];
        const lh = river.level[1 - player];
        for (let h = 0; h < n; h++) if (lm[h] >= 0) mine[lm[h]] += own[h] * chance;
        for (let v = 0; v < lh.length; v++) if (lh[v] >= 0) his[lh[v]] += other[v] * chance;
        const u = walkRiver(line, r, line.tree.root, player, mine, his, weight);
        for (let h = 0; h < n; h++) if (lm[h] >= 0) out[h] += u[lm[h]];
      }
      return out;
    }
    const reg = regret[node.index];
    const k = node.actions.length;
    const value = new Float64Array(n);
    if (node.player === player) {
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
    const sigma = matched(reg, m);
    for (let a = 0; a < k; a++) {
      const next = new Float64Array(m);
      for (let j = 0; j < m; j++) next[j] = other[j] * sigma[a][j];
      const u = walk(node.children[a], player, own, next, weight);
      for (let i = 0; i < n; i++) value[i] += u[i];
    }
    return value;
  };
  for (let t = 1; t <= iterations; t++) for (const player of [0, 1]) walk(tree.root, player, start[player], start[1 - player], t);

  const normal = (avg, last, n) => avg.map((row, a) => Float64Array.from({ length: n }, (_, i) => { let sum = 0; for (const other of avg) sum += other[i]; return sum > 1e-12 ? row[i] / sum : last[a][i]; }));
  const close = (x, y) => Math.abs(x - y) <= 0.02 * Math.max(1, Math.abs(y)) + 0.6;
  const same = (node, seat, nodeActions) => node.actions.length === nodeActions.length
    && node.actions.every((a, k) => (nodeActions[k].to == null ? a.type === nodeActions[k].type : a.type === 'raise' && close(node.wager[seat] + a.add, nodeActions[k].to)));
  const find = (nodes, seat, mine, his, nodeActions) => nodes.find((n) => n.player === seat && close(n.wager[seat], mine) && close(n.wager[1 - seat], his) && same(n, seat, nodeActions));
  /** Follows a line of actions ('check', 'bet 33', 'call' ...: the number is the street total) from the turn's start. */
  const follow = (labels) => {
    let node = tree.root;
    for (const label of labels) {
      if (node.terminal) return null;
      const [type, amount] = label.split(' ');
      const a = node.actions.findIndex((x) => (amount == null ? x.type === type : x.type === 'raise' && close(node.wager[node.player] + x.add, Number(amount))));
      if (a < 0) return null;
      node = node.children[a];
    }
    return node;
  };
  return {
    lines: lines.length,
    /** The turn profile per combo at a decision, or null when the tree has no such decision. */
    turn(seat, wagerMine, wagerHis, nodeActions) {
      const node = find(tree.nodes, seat, wagerMine, wagerHis, nodeActions);
      if (!node) return null;
      const profile = normal(average[node.index], matched(regret[node.index], count[seat]), count[seat]);
      const strategy = nodeActions.map(() => new Float64Array(NUM_COMBOS));
      const passive = nodeActions.findIndex((a) => a.type === 'fold' || a.type === 'check');
      strategy[passive].fill(1);
      hands[seat].forEach((id, h) => { nodeActions.forEach((_, a) => { strategy[a][id] = profile[a][h]; }); });
      return strategy;
    },
    /** The river profile per combo, after the turn line `labels`, on river `card`. */
    river(labels, card, seat, wagerMine, wagerHis, nodeActions) {
      const terminal = follow(labels);
      if (!terminal || terminal.line == null) return null;
      const line = lines[terminal.line];
      const r = rivers.findIndex((x) => x.card === card);
      const node = r < 0 ? null : find(line.tree.nodes, seat, wagerMine, wagerHis, nodeActions);
      if (!node) return null;
      const river = rivers[r];
      const profile = normal(line.average[r][node.index], matched(line.regret[r][node.index], river.levels), river.levels);
      const strategy = nodeActions.map(() => new Float64Array(NUM_COMBOS));
      const passive = nodeActions.findIndex((a) => a.type === 'fold' || a.type === 'check');
      for (let i = 0; i < NUM_COMBOS; i++) {
        const level = river.values[i] >= 0 && COMBO_A[i] !== card && COMBO_B[i] !== card ? river.index.get(river.values[i]) : undefined;
        if (level === undefined) { strategy[passive][i] = 1; continue; }
        nodeActions.forEach((_, a) => { strategy[a][i] = profile[a][level]; });
      }
      return strategy;
    },
  };
}
