import { RangeManager } from 'poker-rangeman';
import { explain, survey } from '../src/explain/river.js';
import { profile } from '../src/explain/profile.js';
import { warpGame } from '../src/warp/game.js';

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
  mode: 'spot', config: { ...DEFAULTS }, nodes: null, node: 0, decision: null, survey: null, hand: null, cell: null, detail: false,
  spot: null, job: 0, status: '', warp: { knobs: [0.03, 0.2, 0.42, 0.6, 0.8, 0.97], game: null, n: 40 },
};
try { const saved = JSON.parse(localStorage.getItem('pareto') ?? 'null'); if (saved?.config) Object.assign(state.config, saved.config); if (saved?.knobs?.length === 6) state.warp.knobs = saved.knobs; state.detail = !!saved?.detail; } catch { /* first visit */ }
const remember = () => { try { localStorage.setItem('pareto', JSON.stringify({ config: state.config, knobs: state.warp.knobs, detail: state.detail })); } catch { /* private window */ } };

// ---- the solver, in a worker ----
const worker = new Worker(new URL('./worker.js', import.meta.url));
worker.onmessage = ({ data }) => {
  if (data.job !== state.job || state.mode !== 'spot') return;
  if (data.type === 'progress') { state.status = `${data.iterations}`; $('state').textContent = state.status; }
  if (data.type === 'error') { state.status = ''; $('state').textContent = ''; $('f-error').textContent = data.message; openSetup(); }
  if (data.type === 'solved') { state.nodes = data.nodes; state.status = `${data.exploit.toFixed(2)}%`; go(0); }
  if (data.type === 'decision') show(data.decision);
};
function solve() {
  state.job++;
  state.nodes = null; state.decision = null; state.survey = null; state.spot = null; state.hand = null; state.cell = null;
  state.status = '0';
  render();
  worker.postMessage({ type: 'solve', job: state.job, config: state.config });
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
  $('board').hidden = !spot; $('curve').hidden = spot; $('combos').hidden = !spot;
  document.querySelector('.spot-only').hidden = !spot;
  $('state').textContent = spot ? state.status : '';
  $('board').innerHTML = cardsHtml(state.config.board);
  const d = state.decision;
  const strata = d ? strataOf(d.actions) : [];
  $('rule').innerHTML = d ? bar(state.survey.mix, strata) : '';
  renderLine(strata);
  if (spot) renderGrid(strata); else { renderCurve(); renderStrip(strata); }
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
    + here.edges.map((e, k) => { const open = nodes[e.child].kind === 'decision'; return `<button type="button" class="act" ${open ? `data-go="${e.child}"` : 'disabled'}><i class="sw" style="background:var(${COLORS[strata[k]]})"></i>${esc(e.label)} ${pct(state.survey.mix[k])}</button>`; }).join('');
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
    if (!c) { html += `<div class="cell out"><span>${name}</span></div>`; continue; }
    const full = i === j ? 6 : i < j ? 4 : 12;
    html += `<button type="button" class="cell" data-cell="${key}" aria-pressed="${state.cell === key}" aria-label="${name}"><div class="fill" style="height:${Math.min(100, (100 * c.weight) / full).toFixed(1)}%">${bar(c.mix.map((x) => x / c.weight), strata)}</div><span>${name}</span></button>`;
  }
  $('range').className = 'range'; $('range').innerHTML = html;
  const picked = cells.get(state.cell);
  $('combos').innerHTML = picked ? picked.hands.sort((x, y) => y.hand.weight - x.hand.weight).map((r) => `<button type="button" data-hand="${r.hand.name}" aria-pressed="${state.hand === r.hand.name}"><span>${cardsHtml(r.hand.name)}</span><span class="bar">${bar(r.hand.strategy, strata)}</span></button>`).join('') : '';
}
function renderStrip(strata) {
  $('range').className = 'strip';
  $('range').innerHTML = state.survey ? [...state.survey.rows].sort((a, b) => a.hand.strength - b.hand.strength).map((r) => `<button type="button" data-hand="${r.hand.name}" aria-pressed="${state.hand === r.hand.name}" aria-label="${pct(r.equity)}%">${(() => { const s = [0, 0, 0, 0, 0]; r.hand.strategy.forEach((p, a) => { s[strata[a]] += p; }); return s.map((x, i) => (x > 0.004 ? `<i style="flex:${x};background:var(${COLORS[i]})"></i>` : '')).join(''); })()}</button>`).join('') : '';
}
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
  const mine = e.map((y, i) => `${X((i + 0.5) / n).toFixed(1)},${Y(y).toFixed(1)}`).join(' ');
  const his = [`${X(0)},${Y(0)}`, ...e.map((y, i) => `${X(y).toFixed(1)},${Y((i + 0.5) / n).toFixed(1)}`), `${X(1)},${Y(1)}`].join(' ');
  $('curve').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Equity curves">`
    + [0.25, 0.5, 0.75].map((v) => `<line class="gridl" x1="${X(0)}" x2="${X(1)}" y1="${Y(v)}" y2="${Y(v)}"/>`).join('')
    + `<line class="axis" x1="${X(0)}" x2="${X(1)}" y1="${Y(0)}" y2="${Y(0)}"/><polyline class="ip" points="${his}"/><polyline class="oop" points="${mine}"/>`
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
$('line').addEventListener('click', (ev) => { const b = ev.target.closest('[data-go]'); if (b) go(+b.dataset.go); });
$('range').addEventListener('click', (ev) => {
  const cell = ev.target.closest('[data-cell]'); const hand = ev.target.closest('[data-hand]');
  if (cell) { state.cell = cell.dataset.cell; const rows = state.survey.rows.filter((r) => cellOf(r.hand.name) === state.cell).sort((a, b) => b.hand.weight - a.hand.weight); state.hand = rows[0]?.hand.name ?? null; render(); }
  if (hand) { state.hand = hand.dataset.hand; render(); }
});
$('combos').addEventListener('click', (ev) => { const b = ev.target.closest('[data-hand]'); if (b) { state.hand = b.dataset.hand; render(); } });
$('why').addEventListener('click', (ev) => { if (ev.target.id === 'more') { state.detail = !state.detail; remember(); renderWhy(); $('more')?.focus(); } });
function openSetup() {
  const c = state.config;
  $('f-board').value = c.board; $('f-oop').value = c.oop; $('f-ip').value = c.ip; $('f-pot').value = c.pot; $('f-stack').value = c.stack;
  $('f-bets').value = c.bets.map((b) => Math.round(100 * b)).join(' '); $('f-raise').value = c.raise;
  $('drawer').hidden = false; $('scrim').hidden = false; (state.mode === 'spot' ? $('f-board') : $('f-pot')).focus();
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
  Object.assign(state.config, { pot, stack, bets, raise }, state.mode === 'spot' ? { board: board.join(' '), oop: $('f-oop').value.trim(), ip: $('f-ip').value.trim() } : {});
  remember(); closeSetup(); state.node = 0; state.hand = null;
  if (state.mode === 'spot') solve(); else solveWarp();
});
solve();
