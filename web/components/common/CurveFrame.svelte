<!-- A chart of equity from 0 to 1 up the side: its grid lines and axis, a ceiling where one is set, and what is drawn on it. -->
<script>
  import { W, yOf } from '../../lib/curve.js';
  let { h, pad = 8, width = W, label, ceiling = null, svg = $bindable(), children } = $props();
  const Y = $derived(yOf(h, pad));
</script>
<svg viewBox="0 0 {width} {h}" role="img" aria-label={label} bind:this={svg}>
  {#each [0.25, 0.5, 0.75] as v}<line class="gridl" x1="0" x2={width} y1={Y(v)} y2={Y(v)} />{/each}
  <line class="axis" x1="0" x2={width} y1={Y(0)} y2={Y(0)} />
  {#if ceiling != null}<line class="ceiling" x1="0" x2={width} y1={Y(ceiling)} y2={Y(ceiling)} />{/if}
  {@render children()}
</svg>
