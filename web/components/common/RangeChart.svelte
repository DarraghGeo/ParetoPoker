<!-- A range as a 13x13 chart: each cell filled by how much of it the range holds; villain's drawn faded, one cell outlined. -->
<script>
  import { cellName, cellOf, cellSize } from '../../lib/cards.js';
  let { title, hands = null, villain = false, marked = null } = $props();
  const held = $derived.by(() => { const cells = new Map(); for (const h of hands ?? []) cells.set(cellOf(h.name), (cells.get(cellOf(h.name)) ?? 0) + h.w); return cells; });
  const combos = $derived(hands ? Math.round((hands ?? []).reduce((t, h) => t + h.w, 0)) : '');
  const at = (k) => k + 1 + (k > 4) + (k > 8);
  const fill = (i, j) => Math.min(1, (held.get(`${i},${j}`) ?? 0) / cellSize(i, j));
</script>
<figure class="mini" class:villain>
  <figcaption><span>{title}</span><span>{combos}</span></figcaption>
  <div class="paint" role="img" aria-label="{title}'s range">
    {#each { length: 169 } as _, n}{@const i = Math.floor(n / 13)}{@const j = n % 13}
      <b class:mark={marked === `${i},${j}`} style="grid-column:{at(j)};grid-row:{at(i)}" title={cellName(i, j)}><i style="height:{Math.round(100 * fill(i, j))}%"></i></b>
    {/each}
  </div>
</figure>
