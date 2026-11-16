<!-- The line: the way here (tap an action to go back to it, a card to change it), the choices at this decision (each leads
     to the next decision, or to the card dealt after it), and the tools: the other range, the chart's form, grid or curve. -->
<script>
  import Cards from '../common/Cards.svelte';
  import Icon from '../common/Icon.svelte';
  import PaintChart from '../common/PaintChart.svelte';
  import Popover from '../common/Popover.svelte';
  import { COLORS, seatName } from '../../lib/actions.js';
  import { villainShares } from '../../lib/study/charts.js';
  import { leadsTo, trail } from '../../lib/study/line.js';
  import { nextChart } from '../../lib/study/prefs.js';
  import { go } from '../../lib/study/solving.js';
  import { remember } from '../../lib/study/versions.svelte.js';
  let { game, strata } = $props();
  const here = $derived(game.nodes && game.decision ? game.nodes[game.node] : null);
  const path = $derived(here ? trail(game.nodes, game.node, game.dealt) : []);
  const CHART = { single: ['split', 'Action chart, split by made hand'], split: ['ladder', 'Action chart, ladder: both ranges on one scale'], ladder: ['butterfly', 'Action chart, butterfly: both ranges by made hand'], butterfly: ['bar', 'Action chart, one bar'] };
  let theirs = $state(false); let anchor = $state();
  function take(edge) { const to = leadsTo(game.nodes, edge); if (to?.go != null) go(game, to.go); else if (to) game.pick = to.deal; }
  function turn(view, value) { game.views[view] = value; remember(game); }
</script>
<nav class="line" aria-label="Line">{#if here}
  <div class="trail">{#each path as p}{#if p.deal != null}<button type="button" class="crumb card" aria-label="Change the card dealt" onclick={() => (game.pick = p.deal)}><Cards cards={p.card ?? ''} /></button>{:else}<button type="button" class="crumb" onclick={() => go(game, p.back)}>{p.label}</button>{/if}<span class="sep">/</span>{/each}<span class="who">{seatName(here.seat)}</span></div>
  <div class="acts">{#each here.edges as e, k}<button type="button" class="act" disabled={!leadsTo(game.nodes, e)} onclick={() => take(e)}><i class="sw" style="background:var({COLORS[strata[k]]})"></i>{e.label}</button>{/each}</div>
  <div class="tools">
    <button bind:this={anchor} type="button" class="icon" aria-label={here.seat === 'oop' ? "In position's range" : "Out of position's range"} onclick={() => (theirs = !theirs)}><Icon name="villain" /></button>
    <button type="button" class="icon" aria-label={CHART[game.views.chart][1]} onclick={() => turn('chart', nextChart(game.views.chart))}><Icon name={CHART[game.views.chart][0]} /></button>
    <button type="button" class="icon" aria-label={game.views.view === 'grid' ? 'Equity distribution' : 'Grid'} onclick={() => turn('view', game.views.view === 'grid' ? 'curve' : 'grid')}><Icon name={game.views.view === 'grid' ? 'curve' : 'grid'} /></button>
  </div>
{/if}</nav>
<Popover bind:open={theirs} {anchor} align="center" gap={8} class="theirs" role="img" label="The other player's range"><PaintChart shares={villainShares(game.decision)} labels={false} /></Popover>
