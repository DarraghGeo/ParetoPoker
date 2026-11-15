<!-- The question on screen: its kind, the hand or rank if one is asked about, the answers, and once graded the verdict,
     why (two lines at once, the rest unfolding), the counts behind it as bars, and any range it is about. Once answered,
     only the answers that matter stay, and Next keeps to the foot of the screen.
     The number keys answer, Enter moves on. -->
<script>
  import Cards from '../common/Cards.svelte';
  import Icon from '../common/Icon.svelte';
  import { tick } from 'svelte';
  import RangeChart from '../common/RangeChart.svelte';
  import { cellOf } from '../../lib/cards.js';
  import Compare from './Compare.svelte';
  import Option from './Option.svelte';
  import Waiting from './Waiting.svelte';
  import { strataOf } from '../../lib/actions.js';
  import { TYPES } from '../../lib/train/prefs.js';
  import { choose, grade } from '../../lib/train/answer.js';
  import { advance } from '../../lib/train/flow.js';
  let { game, blocked = () => false } = $props();
  const q = $derived(game.q);
  let root = $state();
  /** How many lines of why are said at once; the rest unfold. */
  const SAID = 2;
  /** Once answered, the question is brought to the top of the screen if its end is off it, so that the verdict and why are on show. */
  $effect(() => { if (q?.done) tick().then(() => { if (root && root.getBoundingClientRect().bottom > window.innerHeight) root.scrollIntoView({ block: 'start', behavior: 'smooth' }); }); });
  const strata = $derived(game.spot ? strataOf(game.spot.decision.actions) : []);
  function key(ev) {
    if (!q || blocked() || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (ev.key === 'Enter' && document.activeElement?.tagName !== 'BUTTON') { if (q.done) advance(game); else if (q.multi) grade(game); return; }
    const k = Number(ev.key) - 1;
    if (Number.isInteger(k) && k >= 0 && k < q.options.length) choose(game, k);
  }
</script>
<svelte:window onkeydown={key} />
<div class="ask" aria-live="polite" bind:this={root}>
  {#if !q}<Waiting progress={game.progress} error={game.failed >= 3 ? game.error : ''} />
  {:else}
    <div class="kind">{TYPES[q.type]}</div>
    {#if q.context}<div class="sub">{q.context}</div>{/if}
    {#if q.hand}<h2><Cards cards={q.hand} /></h2>{:else if q.plain}<h2>{q.plain}</h2>{/if}
    <p class="text">{q.text}</p>
    <div class="opts" class:done={q.done} class:missed={q.done && !q.ok} class:wide={q.wide} class:shapes={q.options.some((o) => o.shape)} role="group" aria-label="Answers">
      {#each q.options as o, k}<Option label={o.label} cards={o.cards ?? null} shape={o.shape ?? null} colour={o.action != null ? strata[o.action] : null} chosen={q.chosen.includes(k)} done={q.done} right={q.right.includes(k)} onclick={() => choose(game, k)} />{/each}
    </div>
    {#if q.multi && !q.done}<p class="hint">Pick every one that applies.</p>{/if}
    {#if q.done}
      <div class="verdict {q.ok ? 'good' : 'bad'}" role="status"><Icon name={q.ok ? 'tick' : 'cross'} size={14} /><span>{q.ok ? 'Correct' : 'Not this time'}</span></div>
      {#each q.why.slice(0, SAID) as line, k}<p class={k === 0 ? 'fact' : 'more'}>{line}</p>{/each}
      {#each q.bars ?? [] as bar}<Compare {bar} />{/each}
      {#if q.why.length > SAID}<details class="rest"><summary>More</summary>{#each q.why.slice(SAID) as line}<p class="more">{line}</p>{/each}</details>{/if}
      {#if q.show?.after}<div class="minis shown" class:solo={q.show.charts.length === 1}>{#each q.show.charts as c}<RangeChart title={c.title} hands={c.hands} villain={!!c.villain} marked={c.marked ? cellOf(c.marked) : null} />{/each}</div>{/if}
      <button type="button" class="primary" id="next" onclick={() => advance(game)}>Next</button>
    {:else if q.multi}<button type="button" class="primary" id="answer" disabled={!q.chosen.length} onclick={() => grade(game)}>Answer</button>{/if}
  {/if}
</div>
