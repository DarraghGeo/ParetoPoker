<!-- Every hand that carries a name in the analysis: a drawer, strongest first, each with what it does and how its equity
     spreads over the next card. A hand tapped is picked. -->
<script>
  import Bar from '../common/Bar.svelte';
  import Cards from '../common/Cards.svelte';
  import Drawer from '../common/Drawer.svelte';
  import Spark from './Spark.svelte';
  import { pct } from '../../lib/cards.js';
  import { handKey } from '../../lib/study/asks.js';
  import { groupRows } from '../../lib/study/charts.js';
  import { setHand } from '../../lib/study/solving.js';
  let { game, strata } = $props();
  const look = $derived(game.survey ? game.looked.get(handKey(game, game.survey.byName.get(game.hand)?.hand.id ?? null)) : null);
  const type = $derived(game.panel === 'group' ? look?.types.find((t) => t.name === game.group) ?? null : null);
  const rows = $derived(type ? groupRows(game.survey, type) : []);
  const pick = (name) => { setHand(game, name); game.panel = ''; };
</script>
<Drawer bind:open={() => !!type, (open) => { if (!open) game.panel = ''; }} label="Hands of this kind" class="group">{#if type}
  <div class="g-head"><h3>{game.group}</h3><span>{rows.length} hands · {pct(type.share)}% of the range</span></div>
  <div class="mix"><span class="bar"><Bar mix={type.mix} {strata} /></span></div>
  <div class="g-list">{#each rows as r (r.hand.id)}<button type="button" aria-pressed={game.hand === r.hand.name} onclick={() => pick(r.hand.name)}><span><Cards cards={r.hand.name} /></span><span class="bar"><Bar mix={r.hand.strategy} {strata} /></span>{#if look.curves?.[r.hand.id]?.length}<Spark list={look.curves[r.hand.id]} now={r.equity} />{/if}</button>{/each}</div>
{/if}</Drawer>
