<!-- The page with Study beside it, in the same tab: swipe left (or `open`) turns to Study for a spot, swipe right from the
     left edge, the back bar or the phone's back turns back. A street the page solved itself is handed over (`requestExport`,
     answered through `handedOver`), so Study opens on it at once and solves finer behind it. `studying`: Study is on show. -->
<script>
  import { onDestroy } from 'svelte';
  import Study from '../study/Study.svelte';
  import { createStudyGame } from '../../lib/study/game.svelte.js';
  import { handedOver as adopt, openAddress } from '../../lib/study/opening.js';
  import { queryOf } from '../../lib/study/address.js';
  import { swipe } from '../../lib/swipe.js';
  let { back = 'Back', class: cls = '', busy = () => false, onSwipeLeft, requestExport, studying = $bindable(false), children } = $props();
  let game = $state.raw(null); let shown = null; let asked = null;

  /** Open Study on a spot's address; `spot.solve` (with `spot.line`) hands over the page's own solve of its street. */
  export function open(href, spot = null) {
    const url = new URL(href, location.href).href; const handing = spot?.solve != null;
    game ??= createStudyGame();
    if (shown !== url) { shown = url; asked = handing ? { url, line: spot.line } : null; openAddress(game, queryOf(url), handing); if (handing) requestExport(spot.solve, url); }
    if (!studying) { history.pushState({ study: true }, ''); studying = true; }
  }
  /** The worker's answer to `requestExport`, for the spot asked for. */
  export function handedOver(data) { if (data.ask === asked?.url) adopt(game, { ...data, line: asked.line }); }

  const close = () => { if (history.state?.study) history.back(); else studying = false; };
  const mayTurn = (t, ev) => !busy() && !ev.target.closest('input, textarea, select');
  onDestroy(() => game?.worker.terminate());
</script>
<svelte:window onpopstate={() => (studying = !!history.state?.study)} />
<div class="pager" class:on-study={studying}>
  <div class="pane {cls}" inert={studying} use:swipe={{ when: mayTurn, done: (dx) => { if (dx < 0) onSwipeLeft?.(); } }}>{@render children()}</div>
  <div class="pane study-pane" aria-label="Study this spot" inert={!studying} use:swipe={{ when: (t) => t.clientX < 28, done: (dx) => { if (dx > 0) close(); } }}>
    <div class="back-bar"><button type="button" aria-label="Back to {back}" onclick={close}>‹ {back}</button></div>
    {#if game}<div class="study"><Study {game} embedded active={studying} /></div>{/if}
  </div>
</div>
