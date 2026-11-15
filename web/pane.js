// Study beside the page (Train, Play): the spot on screen opens in Study in the same tab, in a pane beside the page.
// Swipe left (or the Study button) turns to it; swipe right from the left edge, the back bar or the phone's back turns
// back. Neither page is reloaded: the page keeps where it is and Study keeps its walk, and the same spot opened again
// is not solved again. A street the page solved itself is handed over, so Study opens on it at once and solves finer
// behind it (see `adopt` in app.js).
import { $ } from './common.js';

/** A swipe: one finger, mostly sideways, far enough. */
function swiper(target, ok, done) {
  let start = null;
  target.addEventListener('touchstart', (ev) => { const t = ev.touches[0]; start = ev.touches.length === 1 && ok(t, ev) ? { x: t.clientX, y: t.clientY } : null; }, { passive: true });
  target.addEventListener('touchend', (ev) => {
    if (!start) return; const t = ev.changedTouches[0]; const dx = t.clientX - start.x; const dy = t.clientY - start.y; start = null;
    if (Math.abs(dx) > 70 && Math.abs(dy) < 40) done(dx);
  }, { passive: true });
}

/**
 * The pane, set up on the page's elements (#pager, #study-frame, #study-pane, the page's own pane, #to-study-back).
 * `worker` answers {type: 'export', solve, ask} with the solve to hand over; `spotOf(link)` gives, for a link that
 * was tapped, `{ solve, line }` (the solve to hand over and the line inside its street) or null; `busy()` is true
 * while a drawer is open and a swipe should not turn the page.
 */
export function studyPane({ page, worker, spotOf, busy = () => false, study = () => $('study') }) {
  const pager = $('pager'); const frame = $('study-frame'); const studyPane = $('study-pane');
  const onStudy = () => pager.classList.contains('on-study');
  const showStudy = (on) => { pager.classList.toggle('on-study', on); studyPane.inert = !on; page.inert = on; };
  const handover = { url: null, data: null, ready: false, line: null };
  function sendHandover() {
    if (!handover.data || !handover.ready) return;
    const d = handover.data; handover.data = null;
    frame.contentWindow.postMessage({ type: 'handover', found: d.found, board: d.board, pot: d.pot, stack: d.stack, oop: d.oop, ip: d.ip, exploit: d.exploit, sums: d.sums, line: handover.line }, location.origin, d.found ? [d.sums.buffer] : []);
  }
  function open(href, spot = null) {
    if (spot?.solve != null) { const u = new URL(href, location.href); u.searchParams.set('handover', '1'); href = u.href; }
    const url = new URL(href, location.href).href;
    if (spot?.solve != null && frame.dataset.url !== url) { Object.assign(handover, { url, data: null, ready: false, line: spot.line }); worker.postMessage({ type: 'export', solve: spot.solve, ask: url }); }
    if (frame.dataset.url !== url) {
      // a new spot replaces the last one in place, so the back gesture keeps meaning "back to the page"
      if (frame.dataset.url) frame.contentWindow.location.replace(url); else frame.src = url;
      frame.dataset.url = url;
    }
    if (!onStudy()) { history.pushState({ study: true }, ''); showStudy(true); }
  }
  const close = () => { if (history.state?.study) history.back(); else showStudy(false); };
  addEventListener('popstate', () => showStudy(!!history.state?.study));
  document.addEventListener('click', (ev) => {
    const a = ev.target.closest('a[data-pane]');
    if (!a || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button === 1) return; // a modified click still opens a new tab
    ev.preventDefault(); open(a.getAttribute('href'), spotOf(a));
  });
  // Study says when it is listening, the worker sends the solve; whichever comes second sends it on
  addEventListener('message', (ev) => {
    if (ev.source !== frame.contentWindow || ev.origin !== location.origin || ev.data?.type !== 'study-ready' || ev.data.url !== handover.url) return;
    handover.ready = true; sendHandover();
  });
  $('to-train').onclick = close;
  swiper(page, (t, ev) => !busy() && !ev.target.closest('input, textarea, select'), (dx) => { if (dx < 0) study()?.click(); });
  // Study is the same site, so its document takes the edge swipe back; Study's own sideways swipe (between versions of
  // the ranges) leaves the left edge to this one when it sits here.
  frame.addEventListener('load', () => {
    try { swiper(frame.contentDocument, (t) => t.clientX < 28, (dx) => { if (dx > 0) close(); }); } catch { /* not readable: the back bar still works */ }
  });
  return { open, close, handedOver: (data) => { if (data.ask !== handover.url) return; handover.data = data; sendHandover(); } };
}
