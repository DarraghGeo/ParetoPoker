<!-- The question on screen: its kind, the hand if one is asked about, the answers, and once graded the verdict and why.
     The number keys answer, Enter moves on. -->
<script>
  import Cards from '../common/Cards.svelte';
  import Icon from '../common/Icon.svelte';
  import Option from './Option.svelte';
  import Waiting from './Waiting.svelte';
  import { strataOf } from '../../lib/actions.js';
  import { TYPES } from '../../lib/train/prefs.js';
  import { choose, grade } from '../../lib/train/answer.js';
  import { advance } from '../../lib/train/flow.js';
  let { game, blocked = () => false } = $props();
  const q = $derived(game.q);
  const strata = $derived(game.spot ? strataOf(game.spot.decision.actions) : []);
  function key(ev) {
    if (!q || blocked() || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (ev.key === 'Enter' && document.activeElement?.tagName !== 'BUTTON') { if (q.done) advance(game); else if (q.multi) grade(game); return; }
    const k = Number(ev.key) - 1;
    if (Number.isInteger(k) && k >= 0 && k < q.options.length) choose(game, k);
  }
</script>
<svelte:window onkeydown={key} />
<div class="ask" aria-live="polite">
  {#if !q}<Waiting progress={game.progress} error={game.failed >= 3 ? game.error : ''} />
  {:else}
    <div class="kind">{TYPES[q.type]}</div>
    {#if q.hand}<h2><Cards cards={q.hand} /></h2>{/if}
    <p class="text">{q.text}</p>
    <div class="opts" class:missed={q.done && !q.ok} role="group" aria-label="Answers">
      {#each q.options as o, k}<Option label={o.label} colour={o.action != null ? strata[o.action] : null} chosen={q.chosen.includes(k)} done={q.done} right={q.right.includes(k)} onclick={() => choose(game, k)} />{/each}
    </div>
    {#if q.multi && !q.done}<p class="hint">Pick every one that applies.</p>{/if}
    {#if q.done}
      <div class="verdict {q.ok ? 'good' : 'bad'}" role="status"><Icon name={q.ok ? 'tick' : 'cross'} size={14} /><span>{q.ok ? 'Correct' : 'Not this time'}</span></div><p class="fact">{q.why[0]}</p>
      <button type="button" class="primary" id="next" onclick={() => advance(game)}>Next</button>
    {:else if q.multi}<button type="button" class="primary" id="answer" disabled={!q.chosen.length} onclick={() => grade(game)}>Answer</button>{/if}
  {/if}
</div>
