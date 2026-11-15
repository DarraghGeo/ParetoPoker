<!-- The panel's two tabs: the reasons, and the analytical look. -->
<script>let { game, first } = $props();</script>
<div class="seg tabs" role="tablist">
  {#each [['why', first], ['look', 'Analysis']] as [tab, label] (tab)}<button type="button" role="tab" aria-selected={game.tab === tab} onclick={() => (game.tab = tab)}>{label}</button>{/each}
</div>
