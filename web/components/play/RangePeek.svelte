<!-- A player's range, brought up by a tap on his cards: a small card over the table with two pages to slide between, the
     range as a 13x13 chart and the butterfly (his range against the other's, in rows by made hand). A tap outside closes it. -->
<script>
  import RangeChart from '../common/RangeChart.svelte';
  import { ROWS, rowOf } from '../../lib/study/butterfly.js';
  let { title, against, mine, his, board, marked = null, villain = false, onclose } = $props();
  let page = $state(0);
  /** The butterfly's rows, strongest first: how much of each range sits in each, as a share of the widest bar. */
  const rows = $derived.by(() => {
    const all = ROWS.map(([code, name]) => ({ code, name, mine: 0, his: 0 })); let a = 0, b = 0;
    for (const h of mine) { all[rowOf(h.name, board)].mine += h.w; a += h.w; }
    for (const h of his) { all[rowOf(h.name, board)].his += h.w; b += h.w; }
    const shown = all.filter((r) => r.mine > 0 || r.his > 0).map((r) => ({ ...r, mine: r.mine / (a || 1), his: r.his / (b || 1) }));
    const most = Math.max(0.0001, ...shown.flatMap((r) => [r.mine, r.his]));
    return shown.reverse().map((r) => ({ ...r, w: (100 * r.mine) / most, v: (100 * r.his) / most }));
  });
  const turned = (ev) => { page = Math.round(ev.currentTarget.scrollLeft / Math.max(1, ev.currentTarget.clientWidth)); };
</script>
<button type="button" class="peek-out" aria-label="Close the range" onclick={onclose}></button>
<section class="peek" class:villain aria-label="{title}'s range">
  <div class="slides" onscroll={turned}>
    <div class="slide"><RangeChart {title} hands={mine} {marked} {villain} /></div>
    <div class="slide"><p class="cap"><span>{title}</span><span>{against}</span></p>
      <div class="pfly">{#each rows as r (r.code)}<div class="frow" title="{r.name}: {Math.round(100 * r.mine)}% of this range, {Math.round(100 * r.his)}% of the other"><div class="wing me"><i style="width:{r.w.toFixed(1)}%"></i></div><span class="code">{r.code}</span><div class="wing him"><i style="width:{r.v.toFixed(1)}%"></i></div></div>{/each}</div></div>
  </div>
  <div class="dots" aria-hidden="true"><i class:on={page === 0}></i><i class:on={page === 1}></i></div>
</section>
