<!-- A range on the 13x13 chart, each cell filled as far as `shares` says (0 to 1). `paintable`: a stroke paints cells in
     or out (the first cell touched decides which, by `held`), told to `onpainted({ add, keys })` when it ends. -->
<script>
  import { CELLS } from '../../lib/cards.js';
  let { shares, held = shares, labels = true, paintable = false, onpainted = () => {}, id = undefined, label = 'Range chart' } = $props();
  let stroke = $state(null); let chart = $state();
  const shareOf = (key) => (stroke?.keys.has(key) ? (stroke.add ? 1 : 0) : (shares.get(key) ?? 0));
  function start(ev) {
    const key = ev.target.closest?.('[data-key]')?.dataset.key; if (!paintable || !key) return;
    ev.preventDefault(); stroke = { add: (held.get(key) ?? 0) <= 0.5, keys: new Set([key]) };
  }
  function move(ev) {
    if (!stroke) return;
    const key = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.('[data-key]');
    if (key && chart.contains(key) && !stroke.keys.has(key.dataset.key)) stroke = { ...stroke, keys: new Set([...stroke.keys, key.dataset.key]) };
  }
  function end() { if (!stroke) return; const done = stroke; stroke = null; onpainted(done); }
</script>
<svelte:window onpointermove={move} onpointerup={end} onpointercancel={end} />
<div class="paint" {id} role="group" aria-label={label} bind:this={chart} onpointerdown={start}>
  {#each CELLS as c (c.key)}{@const share = shareOf(c.key)}
    <b data-key={c.key} class:on={share > 0.5} style={c.at} title={labels ? undefined : c.name}><i style="height:{Math.round(100 * share)}%"></i>{#if labels}<span>{c.name}</span>{/if}</b>
  {/each}
</div>
