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
