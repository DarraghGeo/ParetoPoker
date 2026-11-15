// What the charts under the line draw: the range's hands in their chart cells, the split rows by made hand, and the
// combinations under the chart.
import { CELLS, cellOf, sizeOf } from '../cards.js';

const SHORT = { 'High card': 'HC', Pair: 'P', 'Two pair': '2P', 'Three of a kind': '3K', Straight: 'ST', Flush: 'FL', 'Full house': 'FH', 'Four of a kind': '4K', 'Straight flush': 'SF' };
const capital = (name) => name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

/** Each chart cell the range holds: its weight, its mix of actions (weighted) and its hands. */
export function gridCells(rows, actions) {
  const cells = new Map();
  for (const row of rows) {
    const key = cellOf(row.hand.name);
    if (!cells.has(key)) cells.set(key, { weight: 0, mix: actions.map(() => 0) });
    const c = cells.get(key); c.weight += row.hand.weight;
    row.hand.strategy.forEach((p, a) => { c.mix[a] += row.hand.weight * p; });
  }
  return CELLS.map((cell) => ({ ...cell, held: cells.get(cell.key) ?? null }));
}

/** The split chart: a row for each made hand, strongest first, each hand in its place on the whole range's scale. */
export function splitRows(hands, names) {
  const span = new Map(); const held = new Map(); const n = hands.length;
  hands.forEach((h, k) => { const c = h.row.hand.category; if (!span.has(c)) span.set(c, [k, k]); span.get(c)[1] = k + 1; held.set(c, (held.get(c) ?? 0) + 1); });
  return [...span.entries()].sort((a, b) => b[0] - a[0]).map(([c, [from, to]]) => {
    const name = capital(names[c] ?? '');
    const place = (from + to) / 2 < n / 2 ? `left:calc(${((100 * to) / n).toFixed(2)}% + 8px)` : `right:calc(${(100 * (1 - from / n)).toFixed(2)}% + 8px)`;
    return { category: c, name, short: SHORT[name] ?? name, share: held.get(c) / n, place, hands: hands.map((h) => (h.row.hand.category === c ? h : null)) };
  });
}

/** Under the chart: the combinations of the picked cell (grid) or of the picked strength (curve), most held first. */
export function combosOf(s, view, cell, hand) {
  const picked = s?.byName.get(hand); if (!picked) return [];
  const inCell = (name) => s.rows.filter((r) => cellOf(r.hand.name) === name);
  const rows = view === 'grid' ? inCell(cell) : s.levels.get(picked.hand.strength)?.rows ?? inCell(cellOf(picked.hand.name));
  return [...rows].sort((x, y) => y.hand.weight - x.hand.weight);
}

/** The other player's range at the decision: how much of each chart cell he holds. */
export function villainShares(decision) {
  const cells = new Map();
  for (const v of decision?.villain ?? []) cells.set(cellOf(v.name), (cells.get(cellOf(v.name)) ?? 0) + v.weight);
  return new Map([...cells].map(([key, w]) => [key, Math.min(1, w / sizeOf(key))]));
}

/** The hands that carry a name in the analysis, strongest first. */
export function groupRows(s, type) {
  const ids = new Set(type.ids);
  return s.rows.filter((r) => ids.has(r.hand.id)).sort((x, y) => y.equity - x.equity || (x.hand.name < y.hand.name ? -1 : 1));
}
