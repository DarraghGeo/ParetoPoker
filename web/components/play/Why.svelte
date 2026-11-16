<!-- Why the hand plays as it does at the decision just made: a drawer up from the bottom of the table with the move set
     against the solver, then the same explanation Study gives for the hand, and the way on to Study for the whole range. -->
<script>
  import { fly } from 'svelte/transition';
  import Cards from '../common/Cards.svelte';
  import Said from '../study/Said.svelte';
  let { hero, grade, told, failed = false, onstudy, onclose } = $props();
  const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
</script>
<button type="button" class="peek-out" aria-label="Close" onclick={onclose}></button>
<section class="whyd why" aria-label="Why this hand plays so" transition:fly={{ y: calm ? 0 : 60, duration: calm ? 0 : 220 }}>
  <header><h2><Cards cards={hero} /></h2><span class="grade g-{grade.level}"><i aria-hidden="true"></i><span>{grade.detail}</span></span></header>
  {#if grade.level === 'off'}<p>The solver never gets to this decision with this hand, so it has no play for it here: what it would show is filler, not something it worked out. Nothing is charged for the move. The move that left its line came earlier in the hand, and was charged there.</p>
  {:else if told}
    {#if told.line}<Said text={told.line} detail={told.detail} lead />{/if}
    {#each told.reasons as r}<Said {...r} />{/each}
    {#if told.silent}<p class="quiet">{told.silent}</p>{/if}
  {:else if failed}<p class="quiet">The reasons could not be worked out here. Study has the whole decision.</p>
  {:else}<p class="quiet">Working out the reasons… A flop decision can take half a minute; later streets are quick.</p>{/if}
  <div class="go"><button type="button" class="link" onclick={onstudy}>Open in Study</button><button type="button" class="link" onclick={onclose}>Back to the table</button></div>
</section>
