<!-- Back and forth between versions of the ranges: the arrows, or the arrow keys while nothing else has the keyboard. -->
<script>
  import Icon from '../common/Icon.svelte';
  import { turnTo } from '../../lib/study/solving.js';
  let { game, active = true } = $props();
  const typing = () => /INPUT|TEXTAREA/.test(document.activeElement?.tagName ?? '');
  function key(ev) {
    if (!active || game.panel || typing()) return;
    if (ev.key === 'ArrowLeft') turnTo(game, game.at - 1); else if (ev.key === 'ArrowRight') turnTo(game, game.at + 1);
  }
</script>
<svelte:window onkeydown={key} />
{#if game.versions.length > 1}<nav class="versions" aria-label="Versions">
  <button type="button" class="icon" aria-label="Previous version" disabled={game.at === 0} onclick={() => turnTo(game, game.at - 1)}><Icon name="back" /></button>
  <span>{game.at + 1}/{game.versions.length}</span>
  <button type="button" class="icon" aria-label="Next version" disabled={game.at >= game.versions.length - 1} onclick={() => turnTo(game, game.at + 1)}><Icon name="forward" /></button>
</nav>{/if}
