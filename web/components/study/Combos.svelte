<!-- Under the chart: the combinations of the picked cell (grid) or of the picked strength (curve), each with what it does. -->
<script>
  import Bar from '../common/Bar.svelte';
  import Cards from '../common/Cards.svelte';
  import { combosOf } from '../../lib/study/charts.js';
  import { pickHand } from '../../lib/study/solving.js';
  let { game, strata } = $props();
  const rows = $derived(combosOf(game.survey, game.views.view, game.cell, game.hand));
</script>
<div class="combos">{#each rows as r (r.hand.name)}<button type="button" aria-pressed={game.hand === r.hand.name} onclick={() => pickHand(game, r.hand.name)}><span><Cards cards={r.hand.name} /></span><span class="bar"><Bar mix={r.hand.strategy} {strata} /></span></button>{/each}</div>
