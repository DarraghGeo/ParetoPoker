<!-- The page with Study beside it, in the same tab: swipe left (or `open`) turns to Study for a spot, swipe right from the
     left edge, the back bar or the phone's back turns back. Neither is reloaded. A street the page solved itself is handed
     over (`requestExport`, answered through `handedOver`), so Study opens on it at once and solves finer behind it. -->
<script>
  import { swipe, onSwipe } from '../../lib/swipe.js';
  let { back = 'Back', busy = () => false, onSwipeLeft, requestExport, children } = $props();
  let onStudy = $state(false); let frame = $state();
  const handover = { url: null, data: null, ready: false, line: null };

  /** Open Study on a spot's address; `spot.solve` (with `spot.line`) hands over the page's own solve of its street. */
  export function open(href, spot = null) {
    const url = withHandover(href, spot);
    if (spot?.solve != null && frame.dataset.url !== url) { Object.assign(handover, { url, data: null, ready: false, line: spot.line }); requestExport(spot.solve, url); }
    if (frame.dataset.url !== url) { if (frame.dataset.url) frame.contentWindow.location.replace(url); else frame.src = url; frame.dataset.url = url; }
    if (!onStudy) { history.pushState({ study: true }, ''); onStudy = true; }
  }
  /** The worker's answer to `requestExport`: sent on to Study once it is listening. */
  export function handedOver(data) { if (data.ask !== handover.url) return; handover.data = data; send(); }

  function withHandover(href, spot) { const u = new URL(href, location.href); if (spot?.solve != null) u.searchParams.set('handover', '1'); return u.href; }
  function send() {
    if (!handover.data || !handover.ready) return;
    const d = handover.data; handover.data = null;
    frame.contentWindow.postMessage({ type: 'handover', found: d.found, board: d.board, pot: d.pot, stack: d.stack, oop: d.oop, ip: d.ip, exploit: d.exploit, sums: d.sums, line: handover.line }, location.origin, d.found ? [d.sums.buffer] : []);
  }
  function listened(ev) {
    if (ev.source !== frame?.contentWindow || ev.origin !== location.origin || ev.data?.type !== 'study-ready' || ev.data.url !== handover.url) return;
    handover.ready = true; send();
  }
  const close = () => { if (history.state?.study) history.back(); else onStudy = false; };
  // Study is the same site, so its document takes the edge swipe back
  function loaded() { try { onSwipe(frame.contentDocument, (t) => t.clientX < 28, (dx) => { if (dx > 0) close(); }); } catch { /* the back bar still works */ } }
  const mayTurn = (t, ev) => !busy() && !ev.target.closest('input, textarea, select');
</script>
<svelte:window onpopstate={() => (onStudy = !!history.state?.study)} onmessage={listened} />
<div class="pager" class:on-study={onStudy}>
  <div class="pane" inert={onStudy} use:swipe={{ when: mayTurn, done: (dx) => { if (dx < 0) onSwipeLeft?.(); } }}>{@render children()}</div>
  <div class="pane study-pane" aria-label="Study this spot" inert={!onStudy}>
    <div class="back-bar"><button type="button" aria-label="Back to {back}" onclick={close}>‹ {back}</button></div>
    <iframe title="Study this spot" bind:this={frame} onload={loaded}></iframe>
  </div>
</div>
