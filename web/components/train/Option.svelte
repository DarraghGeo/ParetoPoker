<!-- One answer: its action colour, its label, and once graded a tick (right) or a cross (chosen, wrong). -->
<script>
  import Icon from '../common/Icon.svelte';
  import { COLORS } from '../../lib/actions.js';
  let { label, colour = null, chosen, done, right, onclick } = $props();
  const mark = $derived(!done ? '' : right ? 'right' : chosen ? 'wrong' : '');
</script>
<button type="button" class="opt {mark}" aria-pressed={chosen} disabled={done} {onclick}>
  {#if colour != null}<i class="sw" style="background:var({COLORS[colour]})"></i>{/if}<span>{label}</span>
  {#if mark}<Icon name={mark === 'right' ? 'tick' : 'cross'} size={14} />{/if}
</button>
