<!-- A choice in settings: a box that turns it on or off, and its name, which unfolds its last five days played. -->
<script>
  import Icon from '../common/Icon.svelte';
  import { dayName } from '../../lib/days.js';
  import { pct } from '../../lib/cards.js';
  let { name, on, days, ontoggle } = $props();
  let open = $state(false);
</script>
<div class="choice">
  <button type="button" class="tick" role="checkbox" aria-checked={on} aria-label={name} onclick={ontoggle}><i><Icon name="tick" size={14} /></i></button>
  <button type="button" class="name" aria-expanded={open} onclick={() => (open = !open)}>{name}<Icon name="chevron" size={12} /></button>
</div>
{#if open}
  <ul class="days" aria-label="{name}: last five days played">
    {#each days as d}<li><span>{dayName(d.day)}</span><span class="bar"><i style="flex:{d.ok};background:var(--ok)"></i><i style="flex:{d.n - d.ok};background:var(--danger)"></i></span><span>{d.ok}/{d.n}</span><span>{pct(d.ok / d.n)}%</span></li>
    {:else}<li class="none">Not played yet</li>{/each}
  </ul>
{/if}
