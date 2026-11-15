<!-- Today's score and the last questions. -->
<script>
  import HistoryRow from './HistoryRow.svelte';
  import { pct } from '../../lib/cards.js';
  import { todayOf } from '../../lib/train/prefs.js';
  let { game, hrefOf, onStudy } = $props();
  const t = $derived(todayOf(game.prefs));
</script>
<div class="total"><span class="big"><b>{t.ok}</b>/{t.n}</span><span>{t.n ? `${pct(t.ok / t.n)}% today` : 'Nothing answered today'}</span></div>
{#if game.prefs.log.length}
  <h3>Last questions</h3>
  <ul class="log">{#each game.prefs.log as entry (entry.t)}<HistoryRow {entry} href={hrefOf(entry)} onStudy={(ev) => onStudy(ev, hrefOf(entry))} />{/each}</ul>
{/if}
