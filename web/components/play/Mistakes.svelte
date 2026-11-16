<!-- The hands hero made a mistake in, the last ten: each with its cards, every mistake against what the solver does and
     what it cost, and the way to Study for that decision or to the hand as text. -->
<script>
  import Cards from '../common/Cards.svelte';
  import CopyButton from '../common/CopyButton.svelte';
  import { COSTLY, KEPT, SMALL } from '../../lib/play/mistakes.js';
  let { hands, onstudy, onclose } = $props();
  const day = (at) => new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
</script>
<section class="sitting mistakes" aria-label="Hands with a mistake">
  <h2>Mistakes</h2>
  {#if !hands.length}<p class="said">Nothing here yet. A hand is kept when you make a move the solver almost never makes and it costs {SMALL} or more in EV, or any move that gives up {COSTLY} or more. The last {KEPT} are kept on this device.</p>
  {:else}<ul>{#each hands as h (h.at)}
    <li>
      <div class="top"><span class="hole"><Cards cards={h.hero} /></span><span class="brd"><Cards cards={h.board} /></span><span class="grow"></span><span class="when">{day(h.at)}</span><CopyButton text={() => h.text} label="Copy the hand history" /></div>
      {#each h.mistakes as m}<button type="button" class="miss" onclick={() => onstudy(m.href)}><i aria-hidden="true"></i><span><b>{m.street}: you {m.move}</b> {m.solver}{#if m.cost >= 0.005}{' · '}EV −{m.cost.toFixed(2)}{/if}</span><span class="go" aria-hidden="true">›</span></button>{/each}
    </li>{/each}</ul>
    <p class="said">Tap a mistake to open that decision in Study (it is solved again there). The last {KEPT} hands are kept on this device.</p>{/if}
  <div class="go"><button type="button" class="link" onclick={onclose}>Back to the table</button></div>
</section>
