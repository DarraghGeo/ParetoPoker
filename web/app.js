import { RangeManager } from 'poker-rangeman';
import { explain, survey } from '../src/explain/river.js';
import { profile } from '../src/explain/profile.js';
import { warpGame } from '../src/warp/game.js';
import { NEUTRAL, isNeutral } from '../src/warp/reshape.js';

const $ = (id) => document.getElementById(id);
const COLORS = ['--act-fold', '--act-check', '--act-small', '--act-big', '--act-allin'];
const RANKS = 'AKQJT98765432';
const GLYPH = { s: '♠︎', h: '♥︎', d: '♦︎', c: '♣︎' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct = (x) => `${Math.round(100 * x)}`;
const cardsHtml = (text) => (text.match(/[2-9TJQKA][shdc]/g) ?? []).map((c) => `<span class="s-${c[1]}">${c[0]}${GLYPH[c[1]]}</span>`).join('');

const DEFAULTS = {
  board: 'Td 9d 6h Qc 7s', pot: 100, stack: 200, bets: [0.33, 0.75, 1.5], raise: 2.5, maxRaises: 2,
  oop: '66+,A8s+,A5s-A4s,AJo+,K9s+,KQo,QTs+,JTs,96s+,85s+,75s+,65s,54s',
  ip: 'QQ-22,AQs-A2s,ATo+,K5s+,KJo+,Q8s+,J8s+,T7s+,96s+,86s+,75s+,64s+,53s+',
};
const state = {
  mode: 'spot', config: { ...DEFAULTS }, nodes: null, node: 0, decision: null, survey: null, hand: null, cell: null, detail: false, view: 'grid', split: false,
  spot: null, job: 0, status: '', dials: { who: 'oop', oop: { ...NEUTRAL }, ip: { ...NEUTRAL } }, stats: null, base: new Map(),
  warp: { knobs: [0.03, 0.2, 0.42, 0.6, 0.8, 0.97], game: null, n: 40 },
};
try { const saved = JSON.parse(localStorage.getItem('pareto') ?? 'null'); if (saved?.config) Object.assign(state.config, saved.config); if (saved?.knobs?.length === 6) state.warp.knobs = saved.knobs; state.detail = !!saved?.detail; if (saved?.view === 'curve') state.view = 'curve'; state.split = !!saved?.split; } catch { /* first visit */ }
const remember = () => { try { localStorage.setItem('pareto', JSON.stringify({ config: state.config, knobs: state.warp.knobs, detail: state.detail, view: state.view, split: state.split })); } catch { /* private window */ } };

// ---- the solver, in a worker ----
const worker = new Worker(new URL('./worker.js', import.meta.url));
worker.onmessage = ({ data }) => {
  if (data.job !== state.job || state.mode !== 'spot') return;
  if (data.type === 'progress') { state.status = `${data.iterations}`; $('state').textContent = state.status; }
  if (data.type === 'error') { state.status = ''; $('state').textContent = ''; $('f-error').textContent = data.message; openSetup(); }
  if (data.type === 'solved') { state.nodes = data.nodes; state.stats = data.stats; state.status = `${data.exploit.toFixed(2)}%`; go(state.nodes[state.keep]?.kind === 'decision' ? state.keep : 0); state.keep = 0; }
  if (data.type === 'decision') show(data.decision);
};
/** Solve the spot. `reshaped`: the dials moved, so stay on the same decision and hand. */
function solve(reshaped = false) {
  state.job++;
  if (reshaped) state.keep = state.node;
  else { state.nodes = null; state.decision = null; state.survey = null; state.spot = null; state.hand = null; state.cell = null; state.keep = 0; state.base.clear(); state.dials.oop = { ...NEUTRAL }; state.dials.ip = { ...NEUTRAL }; render(); }
  state.status = '0'; $('state').textContent = state.status;
  worker.postMessage({ type: 'solve', job: state.job, config: { ...state.config, dials: { oop: state.dials.oop, ip: state.dials.ip } } });
  if (reshaped) return;
  const board = state.config.board.match(/[2-9TJQKA][shdc]/g) ?? [];
  const job = state.job;
  profile(RangeManager, { oop: state.config.oop, ip: state.config.ip, board }).then((p) => { if (job === state.job) { state.spot = p; renderWhy(); } });
}
function go(id) {
  state.node = id;
  if (state.mode === 'spot') worker.postMessage({ type: 'decision', job: state.job, id });
  else show(state.warp.game.decisionAt(id));
}
function show(decision) {
  state.decision = decision;
  state.survey = decision ? survey(decision) : null;
  if (state.survey && !state.survey.byName.has(state.hand)) {
    // open on the hand whose choice is least obvious
    let best = null; let score = -1;
    for (const row of state.survey.rows) { const s = (1 - Math.max(...row.hand.strategy)) * row.hand.weight + 1e-6 * row.hand.weight; if (s > score) { score = s; best = row; } }
    state.hand = best?.hand.name ?? null;
    state.cell = best && !decision.abstract ? cellOf(best.hand.name) : null;
  }
  render();
}

// ---- drawing ----
const strataOf = (actions) => { let sized = 0; return actions.map((a) => (a.kind === 'fold' ? 0 : a.kind === 'check' || a.kind === 'call' ? 1 : a.kind === 'allin' ? 4 : sized++ === 0 ? 2 : 3)); };
const bar = (mix, strata) => { const s = [0, 0, 0, 0, 0]; mix.forEach((p, a) => { s[strata[a]] += p; }); return s.map((x, i) => (x > 0.004 ? `<i style="flex:${x};background:var(${COLORS[i]})"></i>` : '')).join(''); };
function cellOf(name) {
  const a = RANKS.indexOf(name[0]); const b = RANKS.indexOf(name[2]);
  const hi = Math.min(a, b); const lo = Math.max(a, b);
  return a === b ? `${hi},${hi}` : name[1] === name[3] ? `${hi},${lo}` : `${lo},${hi}`;
}
function render() {
  const spot = state.mode === 'spot';
  $('mode-spot').setAttribute('aria-pressed', String(spot)); $('mode-warp').setAttribute('aria-pressed', String(!spot));
  const grid = spot && state.view === 'grid';
  $('board').hidden = !spot; $('curve').hidden = spot; $('combos').hidden = !spot; $('range').hidden = !grid; $('dist').hidden = !spot || grid; $('dials').hidden = !spot || grid;
  document.querySelector('.spot-only').hidden = !spot;
  $('state').textContent = spot ? state.status : '';
  $('board').innerHTML = cardsHtml(state.config.board);
  const d = state.decision;
  const strata = d ? strataOf(d.actions) : [];
  $('rule').innerHTML = d ? bar(state.survey.mix, strata) : '';
  renderLine(strata);
  renderStrip(strata);
  if (grid) renderGrid(strata); else if (spot) { renderDist(); renderDials(); } else renderCurve();
  if (spot) renderCombos(strata);
  renderWhy();
}
function renderLine(strata) {
  const nodes = state.mode === 'spot' ? state.nodes : state.warp.game?.nodes;
  if (!nodes || !state.decision) { $('line').innerHTML = ''; return; }
  const path = []; let at = state.node;
  while (nodes[at].parent >= 0) { const parent = nodes[nodes[at].parent]; path.unshift({ label: parent.edges[nodes[at].via].label, back: parent.id }); at = parent.id; }
  const here = nodes[state.node];
  $('line').innerHTML = path.map((p) => `<button type="button" class="crumb" data-go="${p.back}">${esc(p.label)}</button><span class="sep">/</span>`).join('')
    + `<span class="who">${here.seat === 'oop' ? 'OOP' : 'IP'}</span>`
    + here.edges.map((e, k) => { const open = nodes[e.child].kind === 'decision'; return `<button type="button" class="act" ${open ? `data-go="${e.child}"` : 'disabled'}><i class="sw" style="background:var(${COLORS[strata[k]]})"></i>${esc(e.label)} ${pct(state.survey.mix[k])}</button>`; }).join('')
    + (state.mode === 'spot' ? `<button type="button" class="icon view" id="split" aria-pressed="${state.split}" aria-label="${state.split ? 'One bar' : 'By made hand'}">${state.split
      ? '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M2 6.5h12v3H2z" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>'
      : '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M2 3h12M2 6.3h9M2 9.7h12M2 13h6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'}</button><button type="button" class="icon view" id="view" aria-label="${state.view === 'grid' ? 'Equity distribution' : 'Grid'}">${state.view === 'grid'
      ? '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M2 13c3 0 3-4 6-5s3-5 6-5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'
      : '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M2.5 2.5h11v11h-11zM6.2 2.5v11M9.8 2.5v11M2.5 6.2h11M2.5 9.8h11" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>'}</button>` : '');
}
function renderGrid(strata) {
  const cells = new Map();
  if (state.survey) for (const row of state.survey.rows) {
    const key = cellOf(row.hand.name);
    let c = cells.get(key); if (!c) cells.set(key, c = { weight: 0, mix: strata.map(() => 0), hands: [] });
    c.weight += row.hand.weight; row.hand.strategy.forEach((p, a) => { c.mix[a] += row.hand.weight * p; }); c.hands.push(row);
  }
  let html = '';
  for (let i = 0; i < 13; i++) for (let j = 0; j < 13; j++) {
    const key = `${i},${j}`; const c = cells.get(key);
    const name = i === j ? RANKS[i] + RANKS[i] : i < j ? `${RANKS[i]}${RANKS[j]}s` : `${RANKS[j]}${RANKS[i]}o`;
    const at = `grid-column:${j + 1 + (j > 4) + (j > 8)};grid-row:${i + 1 + (i > 4) + (i > 8)}`;
    if (!c) { html += `<div class="cell out" style="${at}"><span>${name}</span></div>`; continue; }
    const full = i === j ? 6 : i < j ? 4 : 12;
    html += `<button type="button" class="cell" style="${at}" data-cell="${key}" aria-pressed="${state.cell === key}" aria-label="${name}"><div class="fill" style="height:${Math.min(100, (100 * c.weight) / full).toFixed(1)}%">${bar(c.mix.map((x) => x / c.weight), strata)}</div><span>${name}</span></button>`;
  }
  $('range').innerHTML = html;
}
/** Under the chart: the combinations of the picked cell (grid) or of the picked strength (curve). */
function renderCombos(strata) {
  const s = state.survey; const picked = s?.byName.get(state.hand);
  const rows = !s || !picked ? [] : state.view === 'grid' ? s.rows.filter((r) => cellOf(r.hand.name) === state.cell) : s.levels.get(picked.hand.strength).rows;
  $('combos').innerHTML = [...rows].sort((x, y) => y.hand.weight - x.hand.weight).map((r) => `<button type="button" data-hand="${r.hand.name}" aria-pressed="${state.hand === r.hand.name}"><span>${cardsHtml(r.hand.name)}</span><span class="bar">${bar(r.hand.strategy, strata)}</span></button>`).join('');
}
/** The two equity curves at this decision: the player to act and, in the other colour, the other range. */
function renderDist() {
  const s = state.survey; if (!s) { $('dist').innerHTML = ''; return; }
  const d = state.decision; const DH = 330;
  // the same horizontal scale as the strip above: the full width
  const Xd = (x) => x * W;
  const Yd = (y) => DH - PAD - y * (DH - 2 * PAD);
  const steps = (list) => { const total = list.reduce((t, r) => t + r.w, 0); let x = 0; const pts = []; for (const r of list) { const w = r.w / total; pts.push(`${Xd(x).toFixed(1)},${Yd(r.e).toFixed(1)} ${Xd(x + w).toFixed(1)},${Yd(r.e).toFixed(1)}`); r.mid = x + w / 2; x += w; } return pts.join(' '); };
  const mine = handsInOrder(s).map((r) => ({ w: 1, e: r.equity, name: r.hand.name }));
  // his hands against the range to act, with the cards each removes
  const his = d.villain.map((v) => { let mass = 0, win = 0; for (const r of s.rows) { const h = r.hand; if (v.cards && h.cards && (v.cards[0] === h.cards[0] || v.cards[0] === h.cards[1] || v.cards[1] === h.cards[0] || v.cards[1] === h.cards[1])) continue; mass += h.weight; win += h.weight * (v.strength > h.strength ? 1 : v.strength < h.strength ? 0 : 0.5); } return { w: v.weight, e: mass > 0 ? win / mass : 0 }; }).sort((a, b) => a.e - b.e);
  const minePts = steps(mine); const hisPts = steps(his);
  // The curve before any reshaping stays as a dotted line, to show what the dials changed
  const untouched = isNeutral(state.dials.oop) && isNeutral(state.dials.ip);
  if (untouched) state.base.set(state.node, minePts);
  const ghost = !untouched && state.base.get(state.node);
  const ceiling = state.dials[d.seat].cap < 1 ? state.dials[d.seat].cap : null;
  const pick = mine.find((r) => r.name === state.hand);
  $('dist').innerHTML = `<svg viewBox="0 0 ${W} ${DH}" role="img" aria-label="Equity distribution">`
    + [0.25, 0.5, 0.75].map((v) => `<line class="gridl" x1="${Xd(0)}" x2="${Xd(1)}" y1="${Yd(v)}" y2="${Yd(v)}"/>`).join('')
    + `<line class="axis" x1="${Xd(0)}" x2="${Xd(1)}" y1="${Yd(0)}" y2="${Yd(0)}"/>${ceiling != null ? `<line class="ceiling" x1="0" x2="${W}" y1="${Yd(ceiling)}" y2="${Yd(ceiling)}"/>` : ''}${ghost ? `<polyline class="ghost" points="${ghost}"/>` : ''}<polyline class="wait" points="${hisPts}"/><polyline class="act" points="${minePts}"/>`
    + (pick ? `<circle class="dot" cx="${Xd(pick.mid).toFixed(1)}" cy="${Yd(pick.e).toFixed(1)}" r="5"/>` : '') + '</svg>';
}
const SHORT = { 'High card': 'HC', Pair: 'P', 'Two pair': '2P', 'Three of a kind': '3K', Straight: 'ST', Flush: 'FL', 'Full house': 'FH', 'Four of a kind': '4K', 'Straight flush': 'SF' };
/**
 * The strategy along the range, weakest to strongest: one column per hand, all the same width.
 * Split, it opens into a row for each made hand, strongest first, each in its own place on the
 * same scale.
 */
function renderStrip(strata) {
  const s = state.survey; const el = $('strip');
  if (!s) { el.innerHTML = ''; return; }
  const hands = handsInOrder(s);
  const column = (row) => {
    const parts = [0, 0, 0, 0, 0]; row.hand.strategy.forEach((p, a) => { parts[strata[a]] += p; });
    return `<button type="button" data-hand="${row.hand.name}" aria-pressed="${row.hand.name === state.hand}" aria-label="${esc(row.hand.name)}">${parts.map((x, k) => (x > 0.004 ? `<i style="flex:${x};background:var(${COLORS[k]})"></i>` : '')).join('')}</button>`;
  };
  const names = state.decision.categories;
  if (!state.split || !names) { el.className = 'strip'; el.innerHTML = hands.map(column).join(''); return; }
  // Every row keeps the whole range's scale: a made hand sits where it sits in the single bar, with gaps either side
  const span = new Map();
  hands.forEach((row, k) => { const c = row.hand.category; if (!span.has(c)) span.set(c, [k, k]); span.get(c)[1] = k + 1; });
  el.className = 'rows';
  el.innerHTML = [...span.entries()].sort((a, b) => b[0] - a[0]).map(([c, [from, to]]) => {
    const name = names[c] ?? ''; const nice = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    const n = hands.length;
    const place = (from + to) / 2 < n / 2 ? `left:calc(${(100 * to / n).toFixed(2)}% + 8px)` : `right:calc(${(100 * (1 - from / n)).toFixed(2)}% + 8px)`;
    return `<div class="row"><div class="strip">${hands.map((row) => (row.hand.category === c ? column(row) : '<span></span>')).join('')}</div><span class="name" style="${place}"><span class="long">${esc(nice)}</span><span class="short">${esc(SHORT[nice] ?? nice)}</span> ${pct((to - from) / n)}</span></div>`;
  }).join('');
}
/** The hands of the range to act, weakest first: the order of the strategy chart and of the equity curve above it. */
const handsInOrder = (s) => [...s.rows].sort((a, b) => a.hand.strength - b.hand.strength || a.equity - b.equity || (a.hand.name < b.hand.name ? -1 : 1));
/** Under the equity chart: what one range looks like, as four numbers that can be dragged to reshape it. */
function renderDials() {
  const who = state.dials.who; const d = state.dials[who]; const st = state.stats?.[who];
  const held = document.activeElement?.dataset?.dial;
  if (held && $('dials').querySelector('[data-dial]')) {
    // a dial is in hand: refresh the numbers only, so the drag is not interrupted
    const set = (key, text) => { const o = $('dials').querySelector(`[data-dial="${key}"]`)?.previousElementSibling; if (o) o.textContent = text; };
    if (st) { set('edge', pct(st.equity)); set('polar', pct(st.polar)); set('nuts', pct(st.nuts)); }
    set('cap', d.cap < 1 ? pct(d.cap) : '\u2014');
    return;
  }
  const dial = (key, name, value, min, max, step, at) => `<label class="dial"><span class="cap">${name}</span><output>${value}</output><input type="range" data-dial="${key}" min="${min}" max="${max}" step="${step}" value="${at}" aria-label="${name}"></label>`;
  const changed = !isNeutral(state.dials.oop) || !isNeutral(state.dials.ip);
  $('dials').innerHTML = `<div class="who"><div class="seg" role="group" aria-label="Range"><button type="button" data-who="oop" aria-pressed="${who === 'oop'}">OOP</button><button type="button" data-who="ip" aria-pressed="${who === 'ip'}">IP</button></div>${changed ? '<button type="button" class="undo" id="undo">Reset</button>' : ''}</div>`
    + dial('edge', 'Equity', st ? pct(st.equity) : '', -100, 100, 5, Math.round(100 * d.edge))
    + dial('polar', 'Polar', st ? pct(st.polar) : '', -100, 100, 5, Math.round(100 * d.polar))
    + dial('nuts', 'Nuts', st ? pct(st.nuts) : '', 0, 200, 10, Math.round(100 * d.nuts))
    + dial('cap', 'Cap', d.cap < 1 ? pct(d.cap) : '\u2014', 50, 100, 2, Math.round(100 * d.cap));
}
let dialTimer = null;
$('dials').addEventListener('input', (ev) => {
  const key = ev.target.dataset?.dial; if (!key) return;
  state.dials[state.dials.who][key] = Number(ev.target.value) / 100;
  clearTimeout(dialTimer); dialTimer = setTimeout(() => solve(true), 180);
});
$('dials').addEventListener('click', (ev) => {
  const who = ev.target.closest('[data-who]');
  if (who) { state.dials.who = who.dataset.who; renderDials(); return; }
  if (ev.target.id === 'undo') { state.dials.oop = { ...NEUTRAL }; state.dials.ip = { ...NEUTRAL }; solve(true); }
});
function renderWhy() {
  const s = state.survey; const told = s && state.hand ? explain(s, state.hand) : null;
  if (!told) { $('why').innerHTML = ''; return; }
  const d = state.decision; const strata = strataOf(d.actions);
  const title = d.abstract ? `${pct(told.equity)}%` : cardsHtml(told.name);
  const reasons = [...told.reasons];
  if (state.spot?.text && !d.abstract) reasons.push({ basis: 'spot', text: state.spot.text });
  $('why').innerHTML = `<h2>${title}</h2>`
    + `<div class="mix"><span class="bar">${bar(told.strategy, strata)}</span><div class="nums">${d.actions.map((a, k) => (told.strategy[k] > 0.004 ? `<span><i class="sw" style="background:var(${COLORS[strata[k]]})"></i>${esc(a.label)} ${pct(told.strategy[k])}</span>` : '')).join('')}</div></div>`
    + `<p class="lead">${esc(told.line)}</p>`
    + (state.detail ? `<ol>${reasons.map((r) => `<li><small>${esc(r.basis)}</small><span>${esc(r.text)}</span></li>`).join('')}</ol>` : '')
    + `<button type="button" class="more" id="more" aria-expanded="${state.detail}">${state.detail ? 'Less' : 'Why'}</button>`;
}

// ---- warp: a curve drawn by hand ----
const W = 560, H = 300, PAD = 8;
const X = (x) => PAD + x * (W - 2 * PAD); const Y = (y) => H - PAD - y * (H - 2 * PAD);
function equitiesOf(knobs, n) {
  return Array.from({ length: n }, (_, i) => { const x = (i + 0.5) / n * (knobs.length - 1); const k = Math.min(knobs.length - 2, Math.floor(x)); return knobs[k] + (knobs[k + 1] - knobs[k]) * (x - k); });
}
function solveWarp() {
  const c = state.config;
  state.warp.game = warpGame({ equities: equitiesOf(state.warp.knobs, state.warp.n), pot: c.pot, stack: c.stack, bets: c.bets, raise: c.raise, iterations: 250 });
  if (!state.warp.game.nodes[state.node] || state.warp.game.nodes[state.node].kind !== 'decision') state.node = 0;
  go(state.node);
}
function renderCurve() {
  const { knobs, n } = state.warp; const e = equitiesOf(knobs, n);
  const acting = state.decision?.seat ?? 'oop';
  const mine = e.map((y, i) => `${X((i + 0.5) / n).toFixed(1)},${Y(y).toFixed(1)}`).join(' ');
  const his = [`${X(0)},${Y(0)}`, ...e.map((y, i) => `${X(y).toFixed(1)},${Y((i + 0.5) / n).toFixed(1)}`), `${X(1)},${Y(1)}`].join(' ');
  $('curve').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Equity curves">`
    + [0.25, 0.5, 0.75].map((v) => `<line class="gridl" x1="${X(0)}" x2="${X(1)}" y1="${Y(v)}" y2="${Y(v)}"/>`).join('')
    + `<line class="axis" x1="${X(0)}" x2="${X(1)}" y1="${Y(0)}" y2="${Y(0)}"/><polyline class="${acting === 'ip' ? 'act' : 'wait'}" points="${his}"/><polyline class="${acting === 'ip' ? 'wait' : 'act'}" points="${mine}"/>`
    + knobs.map((y, k) => `<circle class="knob" data-knob="${k}" cx="${X(k / (knobs.length - 1))}" cy="${Y(y)}" r="7" tabindex="0" role="slider" aria-label="Equity ${k + 1}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct(y)}"/>`).join('') + '</svg>';
}
let dragging = null; let timer = null;
const setKnob = (k, y) => { const { knobs } = state.warp; const lo = k > 0 ? knobs[k - 1] : 0.005; const hi = k < knobs.length - 1 ? knobs[k + 1] : 0.995; knobs[k] = Math.min(hi, Math.max(lo, y)); };
$('curve').addEventListener('pointerdown', (ev) => { const k = ev.target.dataset?.knob; if (k == null) return; dragging = +k; ev.target.setPointerCapture(ev.pointerId); });
$('curve').addEventListener('pointermove', (ev) => {
  if (dragging == null) return;
  const box = $('curve').querySelector('svg').getBoundingClientRect();
  setKnob(dragging, 1 - ((ev.clientY - box.top) / box.height * H - PAD) / (H - 2 * PAD));
  renderCurve(); clearTimeout(timer); timer = setTimeout(() => { solveWarp(); remember(); }, 90);
});
const endDrag = () => { if (dragging == null) return; dragging = null; clearTimeout(timer); solveWarp(); remember(); };
$('curve').addEventListener('pointerup', endDrag); $('curve').addEventListener('pointercancel', endDrag);
$('curve').addEventListener('keydown', (ev) => { const k = ev.target.dataset?.knob; if (k == null) return; const step = ev.key === 'ArrowUp' ? 0.02 : ev.key === 'ArrowDown' ? -0.02 : 0; if (!step) return; ev.preventDefault(); setKnob(+k, state.warp.knobs[+k] + step); solveWarp(); remember(); $('curve').querySelector(`[data-knob="${k}"]`)?.focus(); });

// ---- controls ----
function setMode(mode) {
  if (state.mode === mode) return;
  state.mode = mode; state.node = 0; state.hand = null; state.cell = null; state.decision = null; state.survey = null;
  if (mode === 'spot') solve(); else { state.job++; solveWarp(); }
}
$('mode-spot').onclick = () => setMode('spot'); $('mode-warp').onclick = () => setMode('warp');
$('line').addEventListener('click', (ev) => {
  if (ev.target.closest('#split')) { state.split = !state.split; remember(); render(); $('split')?.focus(); return; }
  if (ev.target.closest('#view')) { state.view = state.view === 'grid' ? 'curve' : 'grid'; remember(); render(); $('view')?.focus(); return; }
  const b = ev.target.closest('[data-go]'); if (b) go(+b.dataset.go);
});
$('strip').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-hand]'); if (!b) return;
  state.hand = b.dataset.hand; state.cell = state.decision.abstract ? null : cellOf(state.hand); render();
});
$('range').addEventListener('click', (ev) => {
  const cell = ev.target.closest('[data-cell]'); const hand = ev.target.closest('[data-hand]');
  if (cell) { state.cell = cell.dataset.cell; const rows = state.survey.rows.filter((r) => cellOf(r.hand.name) === state.cell).sort((a, b) => b.hand.weight - a.hand.weight); state.hand = rows[0]?.hand.name ?? null; render(); }
  if (hand) { state.hand = hand.dataset.hand; render(); }
});
$('combos').addEventListener('click', (ev) => { const b = ev.target.closest('[data-hand]'); if (b) { state.hand = b.dataset.hand; state.cell = cellOf(state.hand); render(); } });
$('why').addEventListener('click', (ev) => { if (ev.target.id === 'more') { state.detail = !state.detail; remember(); renderWhy(); $('more')?.focus(); } });
// ---- setup: the ranges are painted on a chart or typed, whichever is at hand ----
const draft = { side: 'oop', oop: '', ip: '' };
const cellName = (i, j) => (i === j ? RANKS[i] + RANKS[i] : i < j ? `${RANKS[i]}${RANKS[j]}s` : `${RANKS[j]}${RANKS[i]}o`);
/** How much of each chart cell a range holds, 0 to 1, or null when the notation cannot be read. */
function cellsOf(notation) {
  const cells = new Map();
  if (!notation.trim()) return cells;
  try {
    for (const hand of new RangeManager(notation).getHands()) { const key = cellOf(hand); cells.set(key, (cells.get(key) ?? 0) + 1); }
  } catch { return null; }
  for (const [key, n] of cells) { const [i, j] = key.split(',').map(Number); cells.set(key, n / (i === j ? 6 : i < j ? 4 : 12)); }
  return cells;
}
/** The notation for a set of whole cells, as compact as rangeman writes it. */
function notationOf(keys) {
  const names = [...keys].map((key) => { const [i, j] = key.split(',').map(Number); return cellName(i, j); });
  if (!names.length) return '';
  try { return new RangeManager(names.join(',')).toNotation(); } catch { return names.join(','); }
}
let painted = new Map();
function renderPaint() {
  const cells = cellsOf(draft[draft.side]);
  if (cells) painted = cells;
  let html = ''; let combos = 0;
  for (let i = 0; i < 13; i++) for (let j = 0; j < 13; j++) {
    const key = `${i},${j}`; const share = painted.get(key) ?? 0;
    combos += share * (i === j ? 6 : i < j ? 4 : 12);
    html += `<b data-key="${key}" class="${share > 0.5 ? 'on' : ''}" style="grid-column:${j + 1 + (j > 4) + (j > 8)};grid-row:${i + 1 + (i > 4) + (i > 8)}"><i style="height:${Math.round(100 * share)}%"></i><span>${cellName(i, j)}</span></b>`;
  }
  $('paint').innerHTML = html;
  $('p-count').textContent = `${Math.round(combos)}`;
  $('p-oop').setAttribute('aria-pressed', String(draft.side === 'oop')); $('p-ip').setAttribute('aria-pressed', String(draft.side === 'ip'));
  $('f-error').textContent = cells ? '' : 'That range cannot be read.';
}
function showSide(side) { draft.side = side; $('f-range').value = draft[side]; renderPaint(); }
// Painting: the first cell touched decides whether the stroke adds or erases
let stroke = null;
const paintAt = (ev) => {
  const cell = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.('#paint b'); if (!cell || !stroke) return;
  const key = cell.dataset.key; if (stroke.seen.has(key)) return;
  stroke.seen.add(key);
  if (stroke.add) painted.set(key, 1); else painted.delete(key);
  cell.className = stroke.add ? 'on' : ''; cell.firstElementChild.style.height = stroke.add ? '100%' : '0%';
};
$('paint').addEventListener('pointerdown', (ev) => {
  const cell = ev.target.closest('b'); if (!cell) return;
  ev.preventDefault();
  stroke = { add: (painted.get(cell.dataset.key) ?? 0) <= 0.5, seen: new Set() };
  paintAt(ev);
});
window.addEventListener('pointermove', (ev) => { if (stroke) paintAt(ev); });
const endStroke = () => {
  if (!stroke) return; stroke = null;
  draft[draft.side] = notationOf([...painted.entries()].filter(([, share]) => share > 0).map(([key]) => key));
  $('f-range').value = draft[draft.side]; renderPaint();
};
window.addEventListener('pointerup', endStroke); window.addEventListener('pointercancel', endStroke);
$('f-range').addEventListener('input', () => { draft[draft.side] = $('f-range').value; renderPaint(); });
$('p-oop').onclick = () => showSide('oop'); $('p-ip').onclick = () => showSide('ip');
$('p-clear').onclick = () => { draft[draft.side] = ''; showSide(draft.side); };
function openSetup() {
  const c = state.config;
  $('f-board').value = c.board; $('f-pot').value = c.pot; $('f-stack').value = c.stack;
  $('f-bets').value = c.bets.map((b) => Math.round(100 * b)).join(' '); $('f-raise').value = c.raise;
  draft.oop = c.oop; draft.ip = c.ip; showSide(draft.side);
  $('drawer').hidden = false; $('scrim').hidden = false;
  // Focus the drawer itself, never a field: on a phone a focused field brings up the keyboard and zooms the page
  $('drawer').focus({ preventScroll: true });
}
const closeSetup = () => { $('drawer').hidden = true; $('scrim').hidden = true; $('f-error').textContent = ''; };
$('open-setup').onclick = openSetup; $('board').onclick = openSetup; $('scrim').onclick = closeSetup;
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !$('drawer').hidden) closeSetup(); });
$('drawer').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const bets = $('f-bets').value.split(/[\s,]+/).map(Number).filter((x) => x > 0).map((x) => x / 100);
  const pot = Number($('f-pot').value); const stack = Number($('f-stack').value); const raise = Number($('f-raise').value) || 0;
  const board = ($('f-board').value.match(/[2-9TJQKAtjqka][shdcSHDC]/g) ?? []).map((c) => c[0].toUpperCase() + c[1].toLowerCase());
  if (!(pot > 0) || !(stack >= 0) || !bets.length) { $('f-error').textContent = 'Pot, stack and at least one bet size are needed.'; return; }
  if (state.mode === 'spot' && board.length !== 5) { $('f-error').textContent = 'Five board cards are needed.'; return; }
  if (state.mode === 'spot' && (!cellsOf(draft.oop)?.size || !cellsOf(draft.ip)?.size)) { $('f-error').textContent = 'Both ranges need hands.'; return; }
  Object.assign(state.config, { pot, stack, bets, raise }, state.mode === 'spot' ? { board: board.join(' '), oop: draft.oop.trim(), ip: draft.ip.trim() } : {});
  remember(); closeSetup(); state.node = 0; state.hand = null;
  if (state.mode === 'spot') solve(); else solveWarp();
});
solve();
