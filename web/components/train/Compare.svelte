<!-- One count set side by side for the two ranges: a title, and for each range a thin bar and its share. The first range
     is drawn in ink and the second faded, as the charts draw hero and villain. -->
<script>
  import { pct } from '../../lib/cards.js';
  let { bar } = $props();
</script>
<div class="blk" class:decides={bar.decides}>
  <b><span>{bar.title}</span>{#if bar.decides}<em>decides it</em>{/if}</b>
  <ul class="cmp">{#each bar.rows as [name, share], k}<li><span>{name}</span><span class="bar"><i class:v={k === 1} style="width:{Math.min(100, 100 * share * (bar.scale ?? 1))}%"></i></span><span>{pct(share)}%</span></li>{/each}</ul>
</div>
