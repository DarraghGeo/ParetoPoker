<!-- Train's opening screen: the drills in their three groups, each with what it asks and today's score in it. -->
<script>
  import { DRILLS, DRILL_GROUPS, drillToday } from '../../lib/train/prefs.js';
  let { prefs, onpick } = $props();
</script>
<div class="drills">
  <p class="lede">Three things to learn, in order: the ranges, who has the advantage, and what to do about it. Each drill asks first and explains after.</p>
  {#each DRILL_GROUPS as group, k}
    <h3>{k + 1} · {group}</h3>
    <nav class="choose" aria-label={group}>
      {#each DRILLS.filter((d) => d.group === group) as drill}
        {@const t = drillToday(prefs, drill)}
        <button type="button" onclick={() => onpick(drill)}><span><span class="kind">{drill.name}</span><span class="what">{drill.what}</span></span><span class="n" class:played={t.n > 0}>{t.n ? `${t.ok}/${t.n}` : ''}</span></button>
      {/each}
    </nav>
  {/each}
</div>
