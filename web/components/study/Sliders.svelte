<!-- The editor's dials for the range being edited: each with the number it moves, as the range now stands. -->
<script>
  import { pct } from '../../lib/cards.js';
  import { setDial } from '../../lib/study/editor.svelte.js';
  const SLIDERS = [['edge', 'Equity', -100, 100], ['polar', 'Polar', -100, 100], ['nuts', 'Nuts', 0, 200], ['cap', 'Cap', 50, 100]];
  let { game, side } = $props();
  const d = $derived(game.edit.dials[game.edit.who]);
  const shown = $derived({ edge: pct(side.stats.equity), polar: pct(side.stats.polar), nuts: pct(side.stats.nuts), cap: d.cap < 1 ? pct(d.cap) : '—' });
</script>
{#each SLIDERS as [key, name, min, max] (key)}
  <label>{name}<output>{shown[key]}</output><input type="range" {min} {max} step="1" value={Math.round(100 * d[key])} aria-label={name} oninput={(ev) => setDial(game, key, Number(ev.currentTarget.value) / 100)}></label>
{/each}
