<!-- The range on the 13x13 grid: each cell filled as far as the range holds it, in the colours of what it does. -->
<script>
  import Bar from '../common/Bar.svelte';
  import { gridCells } from '../../lib/study/charts.js';
  import { pickCell } from '../../lib/study/solving.js';
  let { game, strata } = $props();
  const cells = $derived(gridCells(game.survey?.rows ?? [], game.decision?.actions ?? []));
</script>
<div class="range">{#each cells as c (c.key)}
  {#if !c.held}<div class="cell out" style={c.at}><span>{c.name}</span></div>
  {:else}<button type="button" class="cell" style={c.at} aria-pressed={game.cell === c.key} aria-label={c.name} onclick={() => pickCell(game, c.key)}><div class="fill" style="height:{Math.min(100, (100 * c.held.weight) / c.size).toFixed(1)}%"><Bar mix={c.held.mix.map((x) => x / c.held.weight)} {strata} /></div><span>{c.name}</span></button>{/if}
{/each}</div>
