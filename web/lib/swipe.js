// A sideways swipe: one finger, mostly sideways, far enough. `when(touch, event)` decides whether a touch may start one;
// `done(dx)` gets how far it went (negative is leftwards).
export function onSwipe(target, when, done) {
  let start = null;
  const down = (ev) => { const t = ev.touches[0]; start = ev.touches.length === 1 && when(t, ev) ? { x: t.clientX, y: t.clientY } : null; };
  const up = (ev) => {
    if (!start) return;
    const t = ev.changedTouches[0]; const dx = t.clientX - start.x; const dy = t.clientY - start.y; start = null;
    if (Math.abs(dx) > 70 && Math.abs(dy) < 40) done(dx);
  };
  target.addEventListener('touchstart', down, { passive: true }); target.addEventListener('touchend', up, { passive: true });
  return () => { target.removeEventListener('touchstart', down); target.removeEventListener('touchend', up); };
}
/** The same as a Svelte action: `use:swipe={{ when, done }}`. */
export const swipe = (node, { when = () => true, done }) => ({ destroy: onSwipe(node, when, done) });
