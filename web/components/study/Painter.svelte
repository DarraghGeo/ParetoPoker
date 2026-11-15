<!-- The setup's ranges, one at a time: painted on the chart (a stroke adds or erases, as the first cell touched decides) or
     typed as notation. -->
<script>
  import PaintChart from '../common/PaintChart.svelte';
  import { seatName } from '../../lib/actions.js';
  import { cellsOf, comboCount, paintedNotation } from '../../lib/study/paint.js';
  let { game } = $props();
  let last = new Map();
  const read = $derived(cellsOf(game.draft[game.draft.side]));
  const cells = $derived(read ?? last);
  $effect(() => { if (read) last = read; });
  const paint = (stroke) => { game.draft[game.draft.side] = paintedNotation(cells, stroke); };
</script>
<div class="painter">
  <div class="head">
    <div class="seg" role="group" aria-label="Range">{#each ['oop', 'ip'] as side (side)}<button type="button" aria-pressed={game.draft.side === side} onclick={() => (game.draft.side = side)}>{seatName(side)}</button>{/each}</div>
    <span class="count">{comboCount(cells)}</span>
    <button type="button" class="clear" onclick={() => (game.draft[game.draft.side] = '')}>Clear</button>
  </div>
  <PaintChart shares={cells} paintable onpainted={paint} />
  <textarea rows="2" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Range notation" bind:value={game.draft[game.draft.side]}></textarea>
</div>
