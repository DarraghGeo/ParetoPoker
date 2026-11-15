<!-- What a hand or a range does: its mix as a bar, and each action taken with its share. -->
<script>
  import Bar from '../common/Bar.svelte';
  import { COLORS } from '../../lib/actions.js';
  import { pct } from '../../lib/cards.js';
  let { mix, actions, strata } = $props();
</script>
<div class="mix"><span class="bar"><Bar {mix} {strata} /></span><div class="nums">
  {#each actions as a, k}{#if mix[k] > 0.004}<span><i class="sw" style="background:var({COLORS[strata[k]]})"></i>{a.label} {pct(mix[k])}</span>{/if}{/each}
</div></div>
