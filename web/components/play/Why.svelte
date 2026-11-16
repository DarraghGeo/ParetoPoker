<!-- Why the hand plays as it does at the decision just made: a drawer up from the bottom of the table. It leads with the
     player's own rule for the decision, what the rule says for this hand, and how often that rule has agreed with the
     solver over the hands played; then the move set against the solver and the explanation Study gives for the hand. -->
<script>
  import { fly } from 'svelte/transition';
  import Cards from '../common/Cards.svelte';
  import Said from '../study/Said.svelte';
  import { RULES } from '../../../src/rules/rules.js';
  let { hero, grade, told, failed = false, rule = null, record = null, onstudy, onclose } = $props();
  const SAYS = { bet: 'bet', check: 'check', call: 'call', continue: 'continue (call or raise)', raise: 'raise', fold: 'fold' };
  const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
</script>
<button type="button" class="peek-out" aria-label="Close" onclick={onclose}></button>
<section class="whyd why" aria-label="Why this hand plays so" transition:fly={{ y: calm ? 0 : 60, duration: calm ? 0 : 220 }}>
  <header><h2><Cards cards={hero} /></h2><span class="grade g-{grade.level}"><i aria-hidden="true"></i><span>{grade.detail}</span></span></header>
  {#if rule}<div class="myrule">
    <p class="kind"><span>Your rule</span><span class="rec" title="How often this rule has agreed with the solver over the hands you have played">{record ? `${record.pct}% over ${record.n}` : 'first time met'}</span></p>
    <p class="text">{RULES[rule.id]}</p>
    <p class="says">Here it says <b>{SAYS[rule.says] ?? rule.says}</b>: {rule.why}.</p>
    <p class="held" class:not={!rule.held}>{!rule.held ? 'The solver does not agree here' : rule.freq >= 0.5 ? 'The solver agrees' : 'The solver is as happy either way'}: it does that {Math.round(100 * rule.freq)}% of the time with this hand{#if rule.cost >= 0.005}, and it gives up {rule.cost.toFixed(2)} in EV{/if}.{#if !rule.held} Kept as an example.{/if}</p>
  </div>{/if}
  {#if grade.level === 'off'}<p>The solver never gets to this decision with this hand, so it has no play for it here: what it would show is filler, not something it worked out. Nothing is charged for the move. The move that left its line came earlier in the hand, and was charged there.</p>
  {:else if told}
    {#if told.line}<Said text={told.line} detail={told.detail} lead />{/if}
    {#each told.reasons as r}<Said {...r} />{/each}
    {#if told.silent}<p class="quiet">{told.silent}</p>{/if}
  {:else if failed}<p class="quiet">The reasons could not be worked out here. Study has the whole decision.</p>
  {:else}<p class="quiet">Working out the reasons…</p>{/if}
  <div class="go"><button type="button" class="link" onclick={onstudy}>Open in Study</button><button type="button" class="link" onclick={onclose}>Back to the table</button></div>
</section>
