<!-- Nothing to ask yet: what is being solved and how far along, or why the setup cannot be solved. -->
<script>
  import Track from '../common/Track.svelte';
  let { progress = null, error = '' } = $props();
  const street = $derived(progress?.street ?? 'flop');
</script>
{#if error}
  <p class="lead">This setup cannot be solved.</p><p>{error}</p><p>The ranges, pot and bet sizes are the ones set up in <a href="study.html">Study</a>.</p>
{:else}
  <div class="kind">Next spot</div><p class="lead">Solving a {street}</p><Track done={progress?.done ?? 0} />
  {#if street === 'flop'}<p>Every spot starts from a flop, which takes up to a minute to solve. Turns and rivers are dealt off it.</p>{/if}
{/if}
