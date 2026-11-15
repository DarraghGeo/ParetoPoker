// What Study's page (app.js, until it is rewritten as components) draws with: the shared pieces come from lib/, the rest
// are its own DOM helpers.
export { RANKS, GLYPH, pct, cellOf, cellName } from './lib/cards.js';
export { COLORS, strataOf } from './lib/actions.js';
export { DEFAULTS } from './lib/setup.js';
export { studyUrl } from './lib/links.js';
export { copyText } from './lib/clipboard.js';
import { GLYPH } from './lib/cards.js';
import { COLORS } from './lib/actions.js';

export const $ = (id) => document.getElementById(id);
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const cardsHtml = (text) => (text.match(/[2-9TJQKA][shdc]/g) ?? []).map((c) => `<span class="s-${c[1]}">${c[0]}${GLYPH[c[1]]}</span>`).join('');
/** A mix of actions as a bar of their colours. */
export const bar = (mix, strata) => { const s = [0, 0, 0, 0, 0]; mix.forEach((p, a) => { s[strata[a]] += p; }); return s.map((x, i) => (x > 0.004 ? `<i style="flex:${x};background:var(${COLORS[i]})"></i>` : '')).join(''); };
const DRAWN = 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';
export const COPY_ICON = `<path d="M5.5 5.5v-3h8v8h-3M2.5 5.5h8v8h-8z" ${DRAWN}/>`;
/** A copy button says how it went, for a moment: a tick, or a cross. */
export function copied(button, ok) {
  const label = button.getAttribute('aria-label');
  button.classList.add(ok ? 'done' : 'failed'); button.setAttribute('aria-label', ok ? 'Copied' : 'Could not copy');
  button.querySelector('svg').innerHTML = ok ? `<path d="M3.5 8.5l3 3 6-7" ${DRAWN}/>` : `<path d="M4 4l8 8M12 4l-8 8" ${DRAWN}/>`;
  setTimeout(() => { if (!button.isConnected) return; button.classList.remove('done', 'failed'); button.setAttribute('aria-label', label); button.querySelector('svg').innerHTML = COPY_ICON; }, 1400);
}
