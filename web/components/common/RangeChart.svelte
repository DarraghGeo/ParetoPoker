<!-- A range as a 13x13 chart: each cell filled by how much of it the range holds; villain's drawn faded, one cell outlined. -->
<script>
  import { CELLS, cellOf } from '../../lib/cards.js';
  let { title, hands = null, villain = false, marked = null } = $props();
  const held = $derived.by(() => { const cells = new Map(); for (const h of hands ?? []) cells.set(cellOf(h.name), (cells.get(cellOf(h.name)) ?? 0) + h.w); return cells; });
  const combos = $derived(hands ? Math.round(hands.reduce((t, h) => t + h.w, 0)) : '');
</script>
<figure class="mini" class:villain>
  <figcaption><span>{title}</span><span>{combos}</span></figcaption>
  <div class="paint" role="img" aria-label="{title}'s range">
    {#each CELLS as c (c.key)}<b class:mark={marked === c.key} style={c.at} title={c.name}><i style="height:{Math.round(100 * Math.min(1, (held.get(c.key) ?? 0) / c.size))}%"></i></b>{/each}
  </div>
</figure>
