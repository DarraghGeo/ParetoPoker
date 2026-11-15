<!-- The range editor: change the ranges of the version on screen with nothing solved, then Save them as a new version. -->
<script>
  import PaintChart from '../common/PaintChart.svelte';
  import EditorCurve from './EditorCurve.svelte';
  import Sliders from './Sliders.svelte';
  import { seatName } from '../../lib/actions.js';
  import { paintEdit, saveEdit } from '../../lib/study/editor.svelte.js';
  import { cellsOf, comboCount } from '../../lib/study/paint.js';
  let { game } = $props();
  let box = $state(); let last = new Map();
  const open = $derived(game.panel === 'editor' && !!game.edit);
  const who = $derived(game.edit?.who);
  const side = $derived(game.editView?.[who]); const other = $derived(game.editView?.[who === 'oop' ? 'ip' : 'oop']);
  const member = $derived((open && cellsOf(game.edit[who])) || last);
  $effect(() => { last = member; });
  // a cell is filled as far as its hands are still in the range once reshaped
  const shown = $derived(new Map([...member].filter(([, n]) => n > 0).map(([key, n]) => [key, side?.cells[key] ?? n])));
  const close = () => { game.panel = ''; };
  $effect(() => { if (open) box?.focus({ preventScroll: true }); });
</script>
<svelte:window onkeydown={(ev) => { if (open && ev.key === 'Escape') close(); }} />
{#if open}
  <div class="scrim" role="presentation" onclick={close}></div>
  <section class="editor" aria-label="Edit ranges" tabindex="-1" bind:this={box}>
    <div class="ed-head">
      <div class="seg" role="group" aria-label="Range">{#each ['oop', 'ip'] as s (s)}<button type="button" aria-pressed={who === s} onclick={() => (game.edit.who = s)}>{seatName(s)}</button>{/each}</div>
      <span class="count">{comboCount(member)}</span><span class="grow"></span>
      <button type="button" onclick={close}>Cancel</button><button type="button" class="primary" onclick={() => saveEdit(game)}>Save</button>
    </div>
    <div class="ed-body"><PaintChart id="e-paint" shares={shown} held={member} paintable onpainted={(stroke) => paintEdit(game, stroke)} /><div class="curve">{#if side}<EditorCurve {game} {side} {other} />{/if}</div></div>
    <div class="sliders">{#if side}<Sliders {game} {side} />{/if}</div>
  </section>
{/if}
