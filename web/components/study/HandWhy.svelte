<!-- A hand picked: what it does and why, as the worker works it out (asked for once a hand), or the analytical look. -->
<script>
  import Cards from '../common/Cards.svelte';
  import Look from './Look.svelte';
  import MixLine from './MixLine.svelte';
  import Said from './Said.svelte';
  import Tabs from './Tabs.svelte';
  import { pct } from '../../lib/cards.js';
  import { askOnce, handKey } from '../../lib/study/asks.js';
  import { handReasons } from '../../lib/study/why.js';
  let { game, strata, row } = $props();
  const d = $derived(game.decision);
  const key = $derived(handKey(game, row.hand.id)); const got = $derived(game.told.get(key));
  $effect(() => { if (!got) askOnce(game, `explain|${key}`, { type: 'explain', combo: row.hand.id }); });
  const reasons = $derived(handReasons(got, game.spot, d, game.nodes[game.node]?.round));
</script>
<h2>{#if d.abstract}{pct(row.equity)}%{:else}<Cards cards={row.hand.name} />{/if}</h2>
<MixLine mix={row.hand.strategy} actions={d.actions} {strata} />
<Tabs {game} first="Why" />
{#if game.tab === 'look'}<Look {game} {row} {strata} />
{:else}{#if got?.line}<Said text={got.line} detail={got.detail} lead />{/if}{#each reasons as r}<Said {...r} />{/each}{/if}
