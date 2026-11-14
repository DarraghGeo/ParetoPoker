// What the Study and Train pages both draw with.
export const $ = (id) => document.getElementById(id);
export const COLORS = ['--act-fold', '--act-check', '--act-small', '--act-big', '--act-allin'];
export const RANKS = 'AKQJT98765432';
export const GLYPH = { s: '♠︎', h: '♥︎', d: '♦︎', c: '♣︎' };
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const pct = (x) => `${Math.round(100 * x)}`;
export const cardsHtml = (text) => (text.match(/[2-9TJQKA][shdc]/g) ?? []).map((c) => `<span class="s-${c[1]}">${c[0]}${GLYPH[c[1]]}</span>`).join('');
/** The spot a first visit opens on. Train deals its own boards and takes the rest from here, or from what Study last saved. */
export const DEFAULTS = {
  board: 'Td 9d 6h Qc 7s', pot: 100, stack: 200, bets: [0.33, 0.75, 1.5], raises: [2.5], maxRaises: 1, allIn: false,
  oop: '66+,A8s+,A5s-A4s,AJo+,K9s+,KQo,QTs+,JTs,96s+,85s+,75s+,65s,54s',
  ip: 'QQ-22,AQs-A2s,ATo+,K5s+,KJo+,Q8s+,J8s+,T7s+,96s+,86s+,75s+,64s+,53s+',
};
/** Which colour each action takes: fold, check or call, the first size, the other sizes, all-in. */
export const strataOf = (actions) => { let sized = 0; return actions.map((a) => (a.kind === 'fold' ? 0 : a.kind === 'check' || a.kind === 'call' ? 1 : a.kind === 'allin' ? 4 : sized++ === 0 ? 2 : 3)); };
export const bar = (mix, strata) => { const s = [0, 0, 0, 0, 0]; mix.forEach((p, a) => { s[strata[a]] += p; }); return s.map((x, i) => (x > 0.004 ? `<i style="flex:${x};background:var(${COLORS[i]})"></i>` : '')).join(''); };
/** The chart cell a hand sits in, as "row,column". */
export function cellOf(name) {
  const a = RANKS.indexOf(name[0]); const b = RANKS.indexOf(name[2]);
  const hi = Math.min(a, b); const lo = Math.max(a, b);
  return a === b ? `${hi},${hi}` : name[1] === name[3] ? `${hi},${lo}` : `${lo},${hi}`;
}
export const cellName = (i, j) => (i === j ? RANKS[i] + RANKS[i] : i < j ? `${RANKS[i]}${RANKS[j]}s` : `${RANKS[j]}${RANKS[i]}o`);

/**
 * The address that opens a spot in Study: the setup, the board, and where in it to open: the
 * actions taken to reach the decision, the cards dealt on the way, the hand picked.
 */
export function studyUrl(config, board, { line = [], dealt = [], hand = null, lite = false } = {}) {
  const q = new URLSearchParams({ board: board.replace(/\s+/g, ''), pot: config.pot, stack: config.stack,
    bets: (Array.isArray(config.bets[0]) ? config.bets : [config.bets]).map((list) => list.map((b) => Math.round(100 * b)).join(',')).join('/'),
    raises: config.raises.join(','), max: config.maxRaises, allin: config.allIn ? 1 : 0, oop: config.oop, ip: config.ip });
  if (line.length) q.set('line', line.join(','));
  if (dealt.length) q.set('dealt', dealt.join(','));
  if (hand) q.set('hand', hand);
  if (lite) q.set('lite', '1');
  return `study.html?${q}`;
}
/** Put text on the clipboard; where the browser will not allow that directly, through a field selected and copied. */
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* not allowed here: the older way */ }
  const field = document.createElement('textarea'); field.value = text; field.setAttribute('readonly', ''); field.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
  document.body.append(field); field.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch { /* nothing more to try */ }
  field.remove(); return ok;
}
const DRAWN = 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';
export const COPY_ICON = `<path d="M5.5 5.5v-3h8v8h-3M2.5 5.5h8v8h-8z" ${DRAWN}/>`;
/** A copy button says how it went, for a moment: a tick, or a cross. */
export function copied(button, ok) {
  const label = button.getAttribute('aria-label');
  button.classList.add(ok ? 'done' : 'failed'); button.setAttribute('aria-label', ok ? 'Copied' : 'Could not copy');
  button.querySelector('svg').innerHTML = ok ? `<path d="M3.5 8.5l3 3 6-7" ${DRAWN}/>` : `<path d="M4 4l8 8M12 4l-8 8" ${DRAWN}/>`;
  setTimeout(() => { if (button.isConnected) { button.classList.remove('done', 'failed'); button.setAttribute('aria-label', label); button.querySelector('svg').innerHTML = COPY_ICON; } }, 1400);
}
