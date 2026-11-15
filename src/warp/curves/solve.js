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
  const cfr = cfrOf(tree, first.length);
  const start = [first, second];
  for (let t = 1; t <= iterations; t++) {
    for (const player of [0, 1]) walk(cfr, tree.root, player, start[player], start[1 - player], t);
  }
  const out = profileOf(cfr, tree.root);
  out.at = (node) => profileOf(cfr, node);
  return out;
}

/** CFR+ state: regrets and the reach-weighted average strategy, `[node][action][level]`. */
const cfrOf = (tree, n) => ({
  n,
  regret: tree.nodes.map((node) => node.actions.map(() => new Float64Array(n))),
  average: tree.nodes.map((node) => node.actions.map(() => new Float64Array(n))),
});

/** Regret matching: each level plays its actions in proportion to their positive regret, evenly when it has none. */
function strategyOf(cfr, node) {
  const r = cfr.regret[node.index];
  const k = r.length;
  const out = r.map(() => new Float64Array(cfr.n));
  for (let i = 0; i < cfr.n; i++) {
    let sum = 0;
    for (let a = 0; a < k; a++) sum += r[a][i];
    for (let a = 0; a < k; a++) out[a][i] = sum > 0 ? r[a][i] / sum : 1 / k;
  }
  return out;
}

/** What each level of `player` gets at a terminal, against the other's reach per level. */
function settle(n, node, player, reach) {
  let all = 0;
  for (let j = 0; j < n; j++) all += reach[j];
  return node.terminal === 'fold' ? foldPayoff(n, node, player, all) : showdownPayoff(n, node, player, reach, all);
}

function foldPayoff(n, node, player, all) {
  const out = new Float64Array(n);
  const value = node.folder === player ? -node.added[player] : node.dead + node.added[1 - player];
  for (let i = 0; i < n; i++) out[i] = value * all;
  return out;
}

/** A level beats the levels below it, ties its own and loses to those above. */
function showdownPayoff(n, node, player, reach, all) {
  const out = new Float64Array(n);
  const mine = node.added[player];
  const his = node.added[1 - player];
  const win = node.dead + his;
  const tie = (node.dead + mine + his) / 2 - mine;
  let below = 0;
  for (let i = 0; i < n; i++) {
    out[i] = win * below + tie * reach[i] - mine * (all - below - reach[i]);
    below += reach[i];
  }
  return out;
}

function walk(cfr, node, player, own, other, weight) {
  if (node.terminal) return settle(cfr.n, node, player, other);
  const sigma = strategyOf(cfr, node);
  return node.player === player ? ownTurn(cfr, node, sigma, player, own, other, weight) : hisTurn(cfr, node, sigma, player, own, other, weight);
}

const reachThrough = (n, reach, share) => {
  const next = new Float64Array(n);
  for (let i = 0; i < n; i++) next[i] = reach[i] * share[i];
  return next;
};

function ownTurn(cfr, node, sigma, player, own, other, weight) {
  const n = cfr.n;
  const utils = [];
  const value = new Float64Array(n);
  for (let a = 0; a < node.actions.length; a++) {
    utils.push(walk(cfr, node.children[a], player, reachThrough(n, own, sigma[a]), other, weight));
    for (let i = 0; i < n; i++) value[i] += sigma[a][i] * utils[a][i];
  }
  learn(cfr, node, sigma, utils, value, own, weight);
  return value;
}

/** CFR+: regrets floored at zero; the average strategy weighted by the iteration and the level's own reach. */
function learn(cfr, node, sigma, utils, value, own, weight) {
  const r = cfr.regret[node.index];
  const avg = cfr.average[node.index];
  for (let a = 0; a < node.actions.length; a++) for (let i = 0; i < cfr.n; i++) {
    r[a][i] = Math.max(0, r[a][i] + utils[a][i] - value[i]);
    avg[a][i] += weight * own[i] * sigma[a][i];
  }
}

function hisTurn(cfr, node, sigma, player, own, other, weight) {
  const n = cfr.n;
  const value = new Float64Array(n);
  for (let a = 0; a < node.actions.length; a++) {
    const u = walk(cfr, node.children[a], player, own, reachThrough(n, other, sigma[a]), weight);
    for (let i = 0; i < n; i++) value[i] += u[i];
  }
  return value;
}

/** The average strategy of a node; where a node was never reached, the last strategy. */
function profileOf(cfr, node) {
  const avg = cfr.average[node.index];
  const last = strategyOf(cfr, node);
  return avg.map((row, a) => row.map((x, i) => {
    const sum = levelTotal(avg, i);
    return sum > 1e-12 ? x / sum : last[a][i];
  }));
}

const levelTotal = (avg, i) => {
  let sum = 0;
  for (const row of avg) sum += row[i];
  return sum;
};
