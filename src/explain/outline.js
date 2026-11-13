/**
 * A decision before the river, laid out like a river survey but with nothing explained: each
 * hand with its equity against the other range and its strategy. Enough to draw the charts.
 *
 * @param {import('./river.js').Decision} decision
 */
export function outline(decision) {
  const rows = decision.hands.map((hand) => ({ hand, equity: Number.isNaN(hand.equity) ? 0 : hand.equity ?? 0 }));
  const total = rows.reduce((t, r) => t + r.hand.weight, 0);
  const mix = decision.actions.map((_, a) => (total > 0 ? rows.reduce((t, r) => t + r.hand.weight * r.hand.strategy[a], 0) / total : 0));
  return { decision, facing: decision.toCall > 0, outline: true, rows, levels: new Map(), mix, byName: new Map(rows.map((r) => [r.hand.name, r])) };
}
