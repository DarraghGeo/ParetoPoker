<!-- The dock under the table: hero's actions when it is his turn, what the hand waits for, or how it ended and the next hand. -->
<script>
  import CopyButton from '../common/CopyButton.svelte';
  import Track from '../common/Track.svelte';
  import { chips, spelled } from '../../lib/actions.js';
  import { act, deal } from '../../lib/play/flow.js';
  import { handText } from '../../lib/play/history.js';
  let { game, config } = $props();
  let sent = $state(null);
  const st = $derived(game.state);
  const solving = $derived(game.status?.solving ? `Solving the ${game.status.solving.replace(' ahead', '')}` : '');
  const words = (a) => (a.kind === 'bet' || a.kind === 'raise' ? spelled(a).replace(/(\d)$/, '$1%').replace(/x%$/, 'x') : spelled(a));
  $effect(() => { st; sent = null; });
</script>
<section class="dock" aria-live="polite">
  {#if game.error}<p class="note">This setup cannot be played: {game.error}</p><p class="note">Change the table with the seats button above.</p>
  {:else if !st}<p class="note">Shuffling up. {solving || 'Solving the first flop'}: a flop takes up to a minute, then the next hands are solved while you play.</p><Track done={game.progress?.done ?? 0} />
  {:else if st.result}
    <div class="after"><button type="button" class="primary" id="next" onclick={() => deal(game)}>Next hand</button>
      <span class="copy"><CopyButton text={() => handText(st, config)} label="Copy the hand history" /><span>Copy hand</span></span></div>
    {#if game.status && !game.status.ready}<Track done={game.progress?.done ?? 0} />{/if}
  {:else if st.toAct}
    <div class="acts">{#each st.actions as a}<button type="button" class="act k-{a.kind}" data-act={a.label} disabled={sent != null} onclick={() => { sent = a.label; act(game, a.label); }}><b>{words(a)}</b>{#if a.add > 0}<span>{chips(a.add)}</span>{/if}</button>{/each}</div>
  {:else}<p class="note wait">{st.waiting ? `Dealing… ${solving ? `(${solving.toLowerCase()})` : ''}` : 'Villain to act'}</p>{#if st.waiting}<Track done={game.progress?.done ?? 0} />{/if}{/if}
</section>
