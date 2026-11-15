<!-- One past question: right or wrong, its kind and spot; unfolded, the answers, why, and a way into Study. -->
<script>
  import Cards from '../common/Cards.svelte';
  import Icon from '../common/Icon.svelte';
  import { TYPES } from '../../lib/train/prefs.js';
  import { seatName } from '../../lib/actions.js';
  let { entry: e, href, onStudy } = $props();
  let open = $state(false);
  const last = $derived(e.line?.[e.line.length - 1]);
  const where = $derived(!e.line?.length ? 'first to act' : last === 'X' ? 'checked to' : `facing ${last}`);
</script>
<li class={e.ok ? 'good' : 'bad'}>
  <button type="button" class="past" aria-expanded={open} onclick={() => (open = !open)}><i class="mark"><Icon name={e.ok ? 'tick' : 'cross'} size={14} /></i><span class="q"><span>{TYPES[e.type] ?? e.type}{#if e.hand} <b><Cards cards={e.hand} /></b>{:else if e.about} <b>{e.about}</b>{/if}</span>{#if e.board}<span class="spot"><b><Cards cards={e.board} /></b> {seatName(e.seat)} {where}</span>{:else if e.context}<span class="spot">{e.context}</span>{/if}</span></button>
  {#if open}
    <dl><dt>Your answer</dt><dd>{e.mine}</dd><dt>Right answer</dt><dd>{e.right}</dd><dt>Why</dt>
      <dd>{#each e.why as p}<p>{p}</p>{/each}{#if !e.explained}<p class="soon">Fuller explanations are written for the river only for now.</p>{/if}{#if e.board}<p><a {href} onclick={onStudy}>Open in Study</a></p>{/if}</dd></dl>
  {/if}
</li>
