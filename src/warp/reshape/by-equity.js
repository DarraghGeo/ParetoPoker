/** The hands of a range that have an equity, weakest first, and the range's weight over them. */
export function byEquity(weights, equity) {
  const ids = [];
  let total = 0;
  for (let i = 0; i < weights.length; i++) if (weights[i] > 0 && !Number.isNaN(equity[i])) { ids.push(i); total += weights[i]; }
  ids.sort((a, b) => equity[a] - equity[b]);
  return { ids, total };
}

export const divideAll = (weights, ids, by) => { for (const i of ids) weights[i] /= by; };
