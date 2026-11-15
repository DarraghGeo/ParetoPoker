// Play: whole hands heads up against the solved villain, flop to river, with the ranges, pot and bet sizes set up in
// Study. The worker deals and solves ahead of play (play-worker.js); this page shows the table and takes hero's actions.
import { studyPane } from './pane.js';
import { $, DEFAULTS, cardsHtml, cellOf, esc, mini, studyUrl } from './common.js';

const config = { ...DEFAULTS };
try { const saved = JSON.parse(localStorage.getItem('pareto') ?? 'null'); if (saved?.config) Object.assign(config, saved.config); } catch { /* first visit */ }
if (!Array.isArray(config.raises)) config.raises = config.raise > 0 ? [config.raise] : [];

/** The session: chips won from the flop on, over the hands played (kept for the day). */
const KEY = 'pareto-play';
const today = new Date().toISOString().slice(0, 10);
const session = { day: today, net: 0, hands: 0, last: 0 };
try { const s = JSON.parse(localStorage.getItem(KEY) ?? 'null'); if (s?.day === today) Object.assign(session, s); } catch { /* private window */ }
const keep = () => { try { localStorage.setItem(KEY, JSON.stringify(session)); } catch { /* private window */ } };

const view = { state: null, status: null, progress: null, ranges: false, study: null, error: '' };
const num = (x) => String(Math.round(10 * x) / 10);
const signed = (x) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${num(Math.abs(x))}`;
const other = (seat) => (seat === 'oop' ? 'ip' : 'oop');
const SEAT = { oop: 'OOP', ip: 'IP' };

const worker = new Worker(new URL('./play-worker.js', import.meta.url));
worker.onmessage = ({ data }) => {
  if (data.type === 'export') { pane.handedOver(data); return; }
  if (data.type === 'status') { view.status = data; if (!view.state || view.state.waiting || view.state.result) renderMoves(); return; }
  if (data.type === 'progress') { view.progress = data; if (!view.state || view.state.waiting || (view.state.result && !view.status?.ready)) renderMoves(); return; }
  if (data.type === 'ready' && !view.state) { worker.postMessage({ type: 'deal' }); return; }
  if (data.type === 'error') { view.error = data.message; renderMoves(); return; }
  if (data.type === 'state') {
    view.state = data;
    if (data.study) view.study = { ...data.study, hero: data.hero };
    if (data.result && session.last !== data.id) { session.last = data.id; session.net += data.result.net; session.hands += 1; keep(); }
    render();
  }
};
worker.postMessage({ type: 'setup', config });

// ---- the table ----
const back = '<span class="back" aria-hidden="true"></span>';
function seatHtml(who, seat, cards, behind, last) {
  return `<div class="who"><span class="name">${who}</span><span class="pos">${SEAT[seat]}</span></div>`
    + `<div class="hole${who === 'You' ? ' big' : ''}">${cards ? cardsHtml(cards) : back + back}</div>`
    + `<div class="stack">${num(behind)} behind</div><div class="last">${last ? esc(last) : ''}</div>`;
}
/** Each player's latest action this street, to show by his seat. */
function lastActions(st) {
  const street = st.history[st.history.length - 1]; const out = { hero: '', villain: '' };
  for (const a of street?.actions ?? []) out[a.who] = a.label;
  return out;
}
function render() {
  const st = view.state;
  $('session').textContent = session.hands ? `${signed(session.net)} · ${session.hands}` : '';
  $('session').classList.toggle('down', session.net < 0);
  if (!st) { $('villain').innerHTML = ''; $('hero').innerHTML = ''; $('p-board').innerHTML = slots(''); $('pot').textContent = ''; $('trail').innerHTML = ''; renderMoves(); return; }
  const me = st.seat === 'oop' ? 0 : 1; const last = lastActions(st);
  $('villain').innerHTML = seatHtml('Villain', other(st.seat), st.villain, st.behind[1 - me], last.villain);
  $('hero').innerHTML = seatHtml('You', st.seat, st.hero, st.behind[me], last.hero);
  $('villain').classList.toggle('acting', !!st.actor && st.actor !== st.seat && !st.result);
  $('hero').classList.toggle('acting', !!st.toAct);
  $('p-board').innerHTML = slots(st.board);
  $('pot').innerHTML = `<span>Pot</span> ${num(st.pot)}`;
  // the streets so far, each action with who took it (the street being played last)
  $('trail').innerHTML = st.history.filter((h) => h.actions.length).map((h) => `<div><span class="street">${esc(h.street)}</span>${h.actions.map((a) => `<span><i>${a.who === 'hero' ? 'You' : 'Villain'}</i> ${esc(a.label)}</span>`).join('')}</div>`).join('');
  renderRanges(); renderMoves(); renderStudy();
}
/** The board: the cards dealt, and faint boxes for the ones to come. */
function slots(board) {
  const cards = board.match(/[2-9TJQKA][shdc]/g) ?? [];
  return cardsHtml(cards.join('')) + '<span class="slot"></span>'.repeat(5 - cards.length);
}
/** Both ranges at the decision on screen: hero in ink with his hand outlined, villain faded (as Train). */
function renderRanges() {
  const st = view.state; const on = view.ranges && !!st?.ranges;
  $('ranges').hidden = !on; $('show-ranges').setAttribute('aria-pressed', String(view.ranges));
  if (!on) return;
  const list = (seat) => st.ranges[seat].map(([name, w]) => ({ name, w }));
  $('ranges').innerHTML = mini(`You ${SEAT[st.seat]}`, list(st.seat), '', cellOf(st.hero)) + mini(`Villain ${SEAT[other(st.seat)]}`, list(other(st.seat)), 'villain');
}
/** The bar for the solve being waited on (as Train's): how far along it is. */
const bar = () => `<div class="track"><i style="width:${(100 * Math.max(0.04, view.progress?.done ?? 0)).toFixed(1)}%"></i></div>`;
/** What hero can do now, what the hand is waiting for, or how it ended and the next one. */
function renderMoves() {
  const st = view.state; const el = $('moves');
  if (view.error) { el.innerHTML = `<p class="note">This setup cannot be played: ${esc(view.error)}</p><p class="note">The ranges, pot and bet sizes are the ones set up in <a href="study.html">Study</a>.</p>`; return; }
  const solving = view.status?.solving ? `Solving the ${esc(view.status.solving.replace(' ahead', ''))}${view.status.solving.endsWith('ahead') ? ' for the hands ahead' : ''}` : '';
  if (!st) { el.innerHTML = `<p class="lead">Dealing the first hand</p>${bar()}<p class="note">Solving its flop. A flop takes up to a minute; after that the next hands are solved while you play.</p>`; return; }
  if (st.result) {
    const r = st.result;
    el.innerHTML = `<p class="result${r.net < 0 ? ' down' : ''}"><b>${signed(r.net)}</b> ${esc(r.how)}${r.mine ? `<span>${esc(r.mine)} against ${esc(r.his)}</span>` : ''}</p>`
      + `<button type="button" class="primary" id="next">Next hand</button>${view.status && !view.status.ready ? `${bar()}<p class="note">${solving || 'Solving the next flop'}</p>` : ''}`;
    $('next').onclick = () => { view.state = null; view.error = ''; render(); worker.postMessage({ type: 'deal' }); };
    return;
  }
  if (st.waiting) { el.innerHTML = `<p class="note">Dealing the ${esc(st.history[st.history.length - 1]?.street === 'flop' ? 'turn' : 'river')}… ${solving ? `(${solving.toLowerCase()})` : ''}</p>${bar()}`; return; }
  if (!st.toAct) { el.innerHTML = '<p class="note">Villain to act…</p>'; return; }
  el.innerHTML = `<div class="acts">${st.actions.map((a) => `<button type="button" class="act k-${a.kind}" data-act="${esc(a.label)}">${esc(words(a))}</button>`).join('')}</div>`;
  for (const b of el.querySelectorAll('[data-act]')) b.onclick = () => { el.querySelectorAll('button').forEach((x) => { x.disabled = true; }); worker.postMessage({ type: 'act', label: b.dataset.act }); };
}
/** An action as a button says it: the solver's short label spelled out. */
function words(a) {
  const amount = a.label.replace(/^[A-Za-z]+\s*/, '');
  return { fold: 'Fold', check: 'Check', call: `Call ${num(a.add)}`, bet: `Bet ${amount}`, raise: `Raise ${amount}`, allin: 'All-in' }[a.kind] ?? a.label;
}
/** The Study link: the last decision of the hand, as Train links a spot (its flop solved lite, the streets after it solved again). */
function renderStudy() {
  const s = view.study; const link = $('study'); link.hidden = !s;
  if (!s) return;
  link.href = studyUrl(config, s.flop, { line: s.line, dealt: s.dealt, hand: s.hero, lite: true, resolve: true });
}
$('show-ranges').onclick = () => { view.ranges = !view.ranges; renderRanges(); };

// ---- Study beside Play (pane.js): the decision on screen opens in Study, the turn or river handed over as solved here ----
const pane = studyPane({ page: $('play-pane'), worker, spotOf: (a) => (a.id === 'study' && view.study?.share ? { solve: view.study.share, line: view.study.streetLine } : null) });
render();
