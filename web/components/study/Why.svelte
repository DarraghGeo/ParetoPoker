<!-- The explanation beside the charts: for the hand picked, what it does and why; with none picked, the range's. -->
<script>
  import HandWhy from './HandWhy.svelte';
  import RangeWhy from './RangeWhy.svelte';
  let { game, strata } = $props();
  const row = $derived(game.survey?.byName.get(game.hand) ?? null);
</script>
<aside class="why" aria-live="polite">{#if game.survey && game.decision}
  {#if row}<HandWhy {game} {strata} {row} />{:else}<RangeWhy {game} {strata} />{/if}
{/if}</aside>
