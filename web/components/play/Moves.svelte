<!-- What hero can do now, what the hand waits for, or how it ended and the next hand. -->
<script>
  import Track from '../common/Track.svelte';
  import { spelled } from '../../lib/actions.js';
  let { game } = $props();
  let sent = $state(null);
  const st = $derived(game.state);
  const num = (x) => String(Math.round(10 * Math.abs(x)) / 10);
  const signed = (x) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${num(x)}`;
  const solving = $derived(game.status?.solving ? `Solving the ${game.status.solving.replace(' ahead', '')}${game.status.solving.endsWith('ahead') ? ' for the hands ahead' : ''}` : '');
  const nextStreet = $derived(st?.history[st.history.length - 1]?.street === 'flop' ? 'turn' : 'river');
  $effect(() => { st; sent = null; });
</script>
<section class="moves" aria-live="polite">
  {#if game.error}<p class="note">This setup cannot be played: {game.error}</p><p class="note">The ranges, pot and bet sizes are the ones set up in <a href="study.html">Study</a>.</p>
  {:else if !st}<p class="lead">Dealing the first hand</p><Track done={game.progress?.done ?? 0} /><p class="note">Solving its flop. A flop takes up to a minute; after that the next hands are solved while you play.</p>
  {:else if st.result}
    <p class="result" class:down={st.result.net < 0}><b>{signed(st.result.net)}</b> {st.result.how}{#if st.result.mine}<span>{st.result.mine} against {st.result.his}</span>{/if}</p>
    <button type="button" class="primary" id="next" onclick={() => game.deal()}>Next hand</button>
    {#if game.status && !game.status.ready}<Track done={game.progress?.done ?? 0} /><p class="note">{solving || 'Solving the next flop'}</p>{/if}
  {:else if st.waiting}<p class="note">Dealing the {nextStreet}… {solving ? `(${solving.toLowerCase()})` : ''}</p><Track done={game.progress?.done ?? 0} />
  {:else if !st.toAct}<p class="note">Villain to act…</p>
  {:else}<div class="acts">{#each st.actions as a}<button type="button" class="act k-{a.kind}" data-act={a.label} disabled={sent != null} onclick={() => { sent = a.label; game.act(a.label); }}>{spelled(a)}</button>{/each}</div>{/if}
</section>
