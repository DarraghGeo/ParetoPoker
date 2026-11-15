<!-- Ranges by preflop action and position: three rows of choices, and what the choice is in words. -->
<script>
  import { presetNote, presetRows } from '../../lib/study/presets.js';
  let { sel, onchoose } = $props();
</script>
{#each presetRows(sel) as row (row.part)}
  <div class="line"><span>{row.name}</span><div class="seg" role="group" aria-label={row.name}>
    {#each row.options as o (o.value)}<button type="button" aria-pressed={o.on} class:far={o.far} onclick={() => onchoose(row.part, o.value)}>{o.label}</button>{/each}
  </div></div>
{/each}
<p class="said">{presetNote(sel)}</p>
