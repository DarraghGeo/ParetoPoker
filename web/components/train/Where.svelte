<!-- Where the hand stands: who hero is, the line so far, the pot and what is behind; Study, copy and the view toggle. -->
<script>
  import CopyButton from '../common/CopyButton.svelte';
  import Icon from '../common/Icon.svelte';
  import { seatName } from '../../lib/actions.js';
  let { decision, studyHref, onStudy, copy, view, onView } = $props();
  const NEXT = { grid: ['curve', 'Equity distribution'], curve: ['ladder', 'Ladder: both ranges on one scale'], ladder: ['grid', 'Ranges'] };
  const last = $derived(decision.line[decision.line.length - 1]);
  const stands = $derived(!decision.line.length ? 'First to act' : last === 'X' ? 'Checked to you' : `Facing ${last}`);
</script>
<div class="where">
  <span class="who">Hero {seatName(decision.seat)}</span><span class="stands">{stands}</span><span class="grow"></span>
  <span class="chips">Pot {Math.round(decision.pot)}</span><span class="chips">Behind {Math.round(decision.behind)}</span>
  <a class="icon" id="study" href={studyHref} aria-label="Study this spot (or swipe left)" title="Study this spot" onclick={onStudy}><Icon name="study" /></a>
  <CopyButton text={copy} label="Copy this spot" />
  <button type="button" class="icon" id="view" aria-label={NEXT[view][1]} onclick={onView}><Icon name={NEXT[view][0]} /></button>
</div>
