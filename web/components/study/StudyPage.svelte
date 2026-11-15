<!-- Study on its own (#/study): the spot the address names, or the setup to make one. -->
<script>
  import { onDestroy } from 'svelte';
  import Study from './Study.svelte';
  import { createStudyGame } from '../../lib/study/game.svelte.js';
  import { openAddress } from '../../lib/study/opening.js';
  import { route } from '../../lib/route.svelte.js';
  const game = createStudyGame();
  openAddress(game, route.query);
  onDestroy(() => game.worker.terminate());
</script>
<Study {game} />
