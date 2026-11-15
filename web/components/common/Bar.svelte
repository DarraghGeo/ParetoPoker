<!-- A mix of actions as a bar of their five colours. -->
<script>
  import { COLORS, strataMix } from '../../lib/actions.js';
  let { mix, strata } = $props();
</script>
{#each strataMix(mix, strata) as x, k}{#if x > 0.004}<i style="flex:{x};background:var({COLORS[k]})"></i>{/if}{/each}
