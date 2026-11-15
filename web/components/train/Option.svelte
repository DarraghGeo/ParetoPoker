<!-- One answer: its action colour, its label (or a hand as cards, or a betting shape drawn above it), and once graded a tick (right) or a cross (chosen, wrong). -->
<script>
  import Icon from '../common/Icon.svelte';
  import { COLORS } from '../../lib/actions.js';
  import Cards from '../common/Cards.svelte';
  let { label, colour = null, cards = null, shape = null, chosen, done, right, onclick } = $props();
  const mark = $derived(!done ? '' : right ? 'right' : chosen ? 'wrong' : '');
</script>
<button type="button" class="opt {mark}" aria-pressed={chosen} disabled={done} {onclick}>
  {#if shape}<span class="shape" aria-hidden="true">{#each shape as v}<b style="height:{v}%"></b>{/each}</span>{/if}{#if colour != null}<i class="sw" style="background:var({COLORS[colour]})"></i>{/if}<span>{#if cards}<b class="hand"><Cards {cards} /></b>{:else}{label}{/if}</span>
  {#if mark}<Icon name={mark === 'right' ? 'tick' : 'cross'} size={14} />{/if}
</button>
