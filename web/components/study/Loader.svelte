<!-- A solve that takes a while says so: what is being solved, how far along, and a way to stop. -->
<script>
  import Cards from '../common/Cards.svelte';
  import Track from '../common/Track.svelte';
  import { conf } from '../../lib/study/versions.svelte.js';
  let { game } = $props();
</script>
{#if game.load?.shown}<div class="loader" role="status" aria-live="polite"><div class="card">
  <div class="title">Solving the {game.load.street} <span><Cards cards={conf(game).board} /></span></div>
  <Track done={game.load.last} />
  <div class="meta"><span>{game.load.note}</span><span class="grow"></span><button type="button" onclick={() => game.worker.postMessage({ type: 'stop' })}>Stop</button></div>
</div></div>{/if}
