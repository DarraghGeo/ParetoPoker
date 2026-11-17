<!-- A range as a 13x13 chart: each cell filled by how much of it the range holds; villain's drawn faded, one cell outlined.
     Where the hands carry a strategy (`mix`, with the `strata` of its actions), the fill is banded in the actions' colours. -->
<script>
  import { bands } from '../../lib/actions.js';
  import { CELLS, cellOf } from '../../lib/cards.js';
  let { title, hands = null, villain = false, marked = null, strata = null } = $props();
  const held = $derived.by(() => { const cells = new Map(); for (const h of hands ?? []) cells.set(cellOf(h.name), (cells.get(cellOf(h.name)) ?? 0) + h.w); return cells; });
  /** Each cell's strategy: its hands' mixes, weighted by how much of each is held. */
  const mixes = $derived.by(() => {
    const cells = new Map(); if (!strata) return cells;
    for (const h of hands ?? []) { if (!h.mix) continue; const k = cellOf(h.name); const m = cells.get(k) ?? h.mix.map(() => 0); h.mix.forEach((p, a) => { m[a] += h.w * p; }); cells.set(k, m); }
    return cells;
  });
  const combos = $derived(hands ? Math.round(hands.reduce((t, h) => t + h.w, 0)) : '');
  const fill = (key) => (mixes.has(key) ? `;background:${bands(mixes.get(key), strata)}` : '');
</script>
<figure class="mini" class:villain={villain && !strata}>
  <figcaption><span>{title}</span><span>{combos}</span></figcaption>
  <div class="paint" role="img" aria-label="{title}'s range">
    {#each CELLS as c (c.key)}<b class:mark={marked === c.key} style={c.at} title={c.name}><i style="height:{Math.round(100 * Math.min(1, (held.get(c.key) ?? 0) / c.size))}%{fill(c.key)}"></i></b>{/each}
  </div>
</figure>
