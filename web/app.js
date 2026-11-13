import { RangeManager } from 'poker-rangeman';
import { explain, survey } from '../src/explain/river.js';
import { profile } from '../src/explain/profile.js';
import { KNOBS, isNeutral, neutral } from '../src/warp/reshape.js';

const $ = (id) => document.getElementById(id);
const COLORS = ['--act-fold', '--act-check', '--act-small', '--act-big', '--act-allin'];
const RANKS = 'AKQJT98765432';
const GLYPH = { s: '♠︎', h: '♥︎', d: '♦︎', c: '♣︎' };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct = (x) => `${Math.round(100 * x)}`;
const cardsHtml = (text) => (text.match(/[2-9TJQKA][shdc]/g) ?? []).map((c) => `<span class="s-${c[1]}">${c[0]}${GLYPH[c[1]]}</span>`).join('');

const DEFAULTS = {
  board: 'Td 9d 6h Qc 7s', pot: 100, stack: 200, bets: [0.33, 0.75, 1.5], raises: [2.5], maxRaises: 2, allIn: false,
  oop: '66+,A8s+,A5s-A4s,AJo+,K9s+,KQo,QTs+,JTs,96s+,85s+,75s+,65s,54s',
  ip: 'QQ-22,AQs-A2s,ATo+,K5s+,KJo+,Q8s+,J8s+,T7s+,96s+,86s+,75s+,64s+,53s+',
};
const state = {
  mode: 'spot', config: { ...DEFAULTS }, nodes: null, node: 0, decision: null, survey: null, hand: null, cell: null, detail: false, view: 'grid', split: false,
  spot: null, job: 0, status: '', stats: null,
  // Every saved edit of the ranges is a version; `at` is the one on screen
  versions: [], at: 0, slide: null,
};
try { const saved = JSON.parse(localStorage.getItem('pareto') ?? 'null'); if (saved?.config) Object.assign(state.config, saved.config);
  // an earlier visit saved one raise size as `raise`
  if (!Array.isArray(state.config.raises)) state.config.raises = state.config.raise > 0 ? [state.config.raise] : [];
  delete state.config.raise; state.detail = !!saved?.detail; if (saved?.view === 'curve') state.view = 'curve'; state.split = !!saved?.split; } catch { /* first visit */ }
const remember = () => { try { localStorage.setItem('pareto', JSON.stringify({ config: state.config, detail: state.detail, view: state.view, split: state.split })); } catch { /* private window */ } };

// ---- the solver, in a worker ----
const worker = new Worker(new URL('./worker.js', import.meta.url));
worker.onmessage = ({ data }) => {
  if (data.type === 'preview') { onPreview(data); return; }
  if (data.job !== state.job) return;
  if (data.type === 'progress') { state.status = `solving ${data.iterations}`; $('state').textContent = state.status; }
  if (data.type === 'error') { state.status = ''; $('state').textContent = ''; $('f-error').textContent = data.message; openSetup(); }
  if (data.type === 'solved') { state.nodes = data.nodes; state.stats = data.stats; state.status = `${data.exploit.toFixed(2)}%`; go(state.nodes[state.keep]?.kind === 'decision' ? state.keep : 0); state.keep = 0; }
  if (data.type === 'decision') show(data.decision);
};
const version = () => state.versions[state.at];
/** Solve the version on screen. `keep`: stay on the same decision and hand (another version of the same spot). */
function solve(keep = false) {
  state.job++;
  if (keep) state.keep = state.node;
  else { state.nodes = null; state.decision = null; state.survey = null; state.spot = null; state.hand = null; state.cell = null; state.keep = 0; render(); }
  state.status = 'solving'; $('state').textContent = state.status;
  const v = version();
  worker.postMessage({ type: 'solve', job: state.job, config: { ...state.config, oop: v.oop, ip: v.ip, dials: v.dials } });
  const board = state.config.board.match(/[2-9TJQKA][shdc]/g) ?? [];
  const job = state.job;
  profile(RangeManager, { oop: v.oop, ip: v.ip, board }).then((p) => { if (job === state.job) { state.spot = p; renderWhy(); } });
}
/** A new spot from setup: its ranges as given are the first version. */
function begin() {
  state.versions = [{ oop: state.config.oop, ip: state.config.ip, dials: { oop: neutral(), ip: neutral() }, curves: new Map() }];
  state.at = 0;
  solve();
}
/** Go to another version: the stage slides away, the other one is solved and slides in. */
function turnTo(index) {
  if (index < 0 || index >= state.versions.length || index === state.at) return;
  const forward = index > state.at;
  state.at = index;
  const stage = document.querySelector('.stage');
  stage.classList.add(forward ? 'out-left' : 'out-right');
  state.slide = forward ? 'in-right' : 'in-left';
  solve(true);
}
function go(id) {
  state.node = id;
  worker.postMessage({ type: 'decision', job: state.job, id });
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
  if (state.slide) {
    // the other version comes in from the side it lives on
    const stage = document.querySelector('.stage'); const from = state.slide; state.slide = null;
    stage.classList.remove('out-left', 'out-right'); stage.classList.add(from);
    requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.remove(from)));
  }
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
  const grid = state.view === 'grid';
  $('range').hidden = !grid; $('dist').hidden = grid;
  $('state').textContent = state.status;
  $('versions').hidden = state.versions.length < 2;
  $('version').textContent = `${state.at + 1}/${state.versions.length}`;
  $('older').disabled = state.at === 0; $('newer').disabled = state.at >= state.versions.length - 1;
  $('board').innerHTML = cardsHtml(state.config.board);
  const d = state.decision;
  const strata = d ? strataOf(d.actions) : [];
  $('rule').innerHTML = d ? bar(state.survey.mix, strata) : '';
  renderLine(strata);
  renderStrip(strata);
  if (grid) renderGrid(strata); else renderDist();
  renderCombos(strata);
  renderWhy();
}
function renderLine(strata) {
  const nodes = state.nodes;
  if (!nodes || !state.decision) { $('line').innerHTML = ''; return; }
  const path = []; let at = state.node;
  while (nodes[at].parent >= 0) { const parent = nodes[nodes[at].parent]; path.unshift({ label: parent.edges[nodes[at].via].label, back: parent.id }); at = parent.id; }
  const here = nodes[state.node];
  $('line').innerHTML = path.map((p) => `<button type="button" class="crumb" data-go="${p.back}">${esc(p.label)}</button><span class="sep">/</span>`).join('')
    + `<span class="who">${here.seat === 'oop' ? 'OOP' : 'IP'}</span>`
    + here.edges.map((e, k) => { const open = nodes[e.child].kind === 'decision'; return `<button type="button" class="act" ${open ? `data-go="${e.child}"` : 'disabled'}><i class="sw" style="background:var(${COLORS[strata[k]]})"></i>${esc(e.label)} ${pct(state.survey.mix[k])}</button>`; }).join('')
    + (true ? `<button type="button" class="icon view" id="edit" aria-label="Edit ranges"><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="M3 13l.6-2.8L10.9 3a1.1 1.1 0 0 1 1.6 0l.5.5a1.1 1.1 0 0 1 0 1.6L5.8 12.4z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg></button><button type="button" class="icon view" id="split" aria-pressed="${state.split}" aria-label="${state.split ? 'One bar' : 'By made hand'}">${state.split
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
  const d = state.decision; const DH = 540;
  // the same horizontal scale as the strip above: the full width
  const Xd = (x) => x * W;
  const Yd = (y) => DH - PAD - y * (DH - 2 * PAD);
  const steps = (list) => { const total = list.reduce((t, r) => t + r.w, 0); let x = 0; const pts = []; for (const r of list) { const w = r.w / total; pts.push(`${Xd(x).toFixed(1)},${Yd(r.e).toFixed(1)} ${Xd(x + w).toFixed(1)},${Yd(r.e).toFixed(1)}`); r.mid = x + w / 2; x += w; } return pts.join(' '); };
  const mine = handsInOrder(s).map((r) => ({ w: r.hand.weight, e: r.equity, name: r.hand.name }));
  // his hands against the range to act, with the cards each removes
  const his = d.villain.map((v) => { let mass = 0, win = 0; for (const r of s.rows) { const h = r.hand; if (v.cards && h.cards && (v.cards[0] === h.cards[0] || v.cards[0] === h.cards[1] || v.cards[1] === h.cards[0] || v.cards[1] === h.cards[1])) continue; mass += h.weight; win += h.weight * (v.strength > h.strength ? 1 : v.strength < h.strength ? 0 : 0.5); } return { w: v.weight, e: mass > 0 ? win / mass : 0 }; }).sort((a, b) => a.e - b.e);
  const minePts = steps(mine); const hisPts = steps(his);
  // The same decision in the version before this one stays as a dotted line
  version().curves.set(state.node, minePts);
  const ghost = state.at > 0 ? state.versions[state.at - 1].curves.get(state.node) : null;
  const cap = version().dials[d.seat].cap;
  const ceiling = cap < 1 ? cap : null;
  const knobs = '';
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
    return `<button type="button" data-hand="${row.hand.name}" aria-pressed="${row.hand.name === state.hand}" aria-label="${esc(row.hand.name)}"><b style="height:100%">${parts.map((x, k) => (x > 0.004 ? `<i style="flex:${x};background:var(${COLORS[k]})"></i>` : '')).join('')}</b></button>`;
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

const W = 560, PAD = 8;
$('line').addEventListener('click', (ev) => {
  if (ev.target.closest('#edit')) { openEditor(); return; }
  if (ev.target.closest('#split')) { state.split = !state.split; remember(); render(); $('split')?.focus(); return; }
  if (ev.target.closest('#view')) { state.view = state.view === 'grid' ? 'curve' : 'grid'; remember(); render(); $('view')?.focus(); return; }
  const b = ev.target.closest('[data-go]'); if (b) go(+b.dataset.go);
});
$('strip').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-hand]'); if (!b) return;
  state.hand = b.dataset.hand; state.cell = cellOf(state.hand); render();
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
  $('f-bets').value = c.bets.map((b) => Math.round(100 * b)).join(' '); $('f-raise').value = c.raises.join(' '); $('f-max').value = c.maxRaises; $('f-allin').checked = !!c.allIn;
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
  const pot = Number($('f-pot').value); const stack = Number($('f-stack').value);
  const raises = $('f-raise').value.split(/[\s,x]+/i).map(Number).filter((x) => x > 1);
  const maxRaises = Math.max(0, Math.min(4, Math.round(Number($('f-max').value) || 0)));
  const board = ($('f-board').value.match(/[2-9TJQKAtjqka][shdcSHDC]/g) ?? []).map((c) => c[0].toUpperCase() + c[1].toLowerCase());
  if (!(pot > 0) || !(stack >= 0) || !bets.length) { $('f-error').textContent = 'Pot, stack and at least one bet size are needed.'; return; }
  if (board.length !== 5) { $('f-error').textContent = 'Five board cards are needed.'; return; }
  if ((!cellsOf(draft.oop)?.size || !cellsOf(draft.ip)?.size)) { $('f-error').textContent = 'Both ranges need hands.'; return; }
  Object.assign(state.config, { pot, stack, bets, raises: maxRaises > 0 ? raises : [], maxRaises: raises.length ? maxRaises : 0, allIn: $('f-allin').checked, board: board.join(' '), oop: draft.oop.trim(), ip: draft.ip.trim() });
  remember(); closeSetup(); state.node = 0; state.hand = null;
  begin();
});


// ---- versions: back and forth between edits of the ranges ----
$('older').onclick = () => turnTo(state.at - 1); $('newer').onclick = () => turnTo(state.at + 1);
document.addEventListener('keydown', (ev) => {
  if (!$('editor').hidden || !$('drawer').hidden || /INPUT|TEXTAREA/.test(document.activeElement?.tagName ?? '')) return;
  if (ev.key === 'ArrowLeft') turnTo(state.at - 1); else if (ev.key === 'ArrowRight') turnTo(state.at + 1);
});
let swipe = null;
const stage = document.querySelector('.stage');
stage.addEventListener('touchstart', (ev) => { const t = ev.touches[0]; swipe = ev.touches.length === 1 ? { x: t.clientX, y: t.clientY } : null; }, { passive: true });
stage.addEventListener('touchend', (ev) => {
  if (!swipe) return; const t = ev.changedTouches[0]; const dx = t.clientX - swipe.x; const dy = t.clientY - swipe.y; swipe = null;
  if (Math.abs(dx) > 70 && Math.abs(dy) < 40) turnTo(state.at + (dx < 0 ? 1 : -1));
}, { passive: true });

// ---- the editor: change the ranges with nothing solved, then Save ----
const SLIDERS = { edge: ['Equity', -100, 100, 5], polar: ['Polar', -100, 100, 5], nuts: ['Nuts', 0, 200, 10], cap: ['Cap', 50, 100, 2] };
const edit = { who: 'oop', oop: '', ip: '', dials: null, view: null, id: 0, timer: null, cells: new Map() };
const EH = 300;
const Ye = (y) => EH - PAD - y * (EH - 2 * PAD);
function openEditor() {
  const v = version();
  Object.assign(edit, { who: state.decision?.seat ?? 'oop', oop: v.oop, ip: v.ip, dials: JSON.parse(JSON.stringify(v.dials)), view: null });
  $('editor').hidden = false; $('editor').focus({ preventScroll: true });
  drawEditor(); preview();
}
const closeEditor = () => { $('editor').hidden = true; };
function preview() {
  clearTimeout(edit.timer);
  edit.timer = setTimeout(() => worker.postMessage({ type: 'preview', id: ++edit.id, config: { board: state.config.board, oop: edit.oop, ip: edit.ip, dials: edit.dials } }), 40);
}
function onPreview(data) {
  if (data.id !== edit.id || data.error) return;
  edit.view = data.sides; drawEditor();
}
function drawEditor() {
  const who = edit.who; const side = edit.view?.[who]; const other = edit.view?.[who === 'oop' ? 'ip' : 'oop'];
  $('e-oop').setAttribute('aria-pressed', String(who === 'oop')); $('e-ip').setAttribute('aria-pressed', String(who === 'ip'));
  // the chart: a cell is filled as far as its hands are still in the range once reshaped
  const member = cellsOf(edit[who]) ?? edit.cells; edit.cells = member;
  let html = ''; let combos = 0;
  for (let i = 0; i < 13; i++) for (let j = 0; j < 13; j++) {
    const key = `${i},${j}`; const inRange = (member.get(key) ?? 0) > 0; const share = inRange ? side?.cells[key] ?? member.get(key) : 0;
    combos += (member.get(key) ?? 0) * (i === j ? 6 : i < j ? 4 : 12);
    html += `<b data-key="${key}" class="${share > 0.5 ? 'on' : ''}" style="grid-column:${j + 1 + (j > 4) + (j > 8)};grid-row:${i + 1 + (i > 4) + (i > 8)}"><i style="height:${Math.round(100 * share)}%"></i><span>${cellName(i, j)}</span></b>`;
  }
  if (!edit.stroke) $('e-paint').innerHTML = html;
  $('e-count').textContent = `${Math.round(combos)}`;
  // the two curves, the range being edited in full ink with its handles
  if (side && edit.grab == null) {
    const steps = (list) => { const total = list.reduce((t, r) => t + r[0], 0); let x = 0; return list.map((r) => { const w = r[0] / total; const p = `${(x * W).toFixed(1)},${Ye(r[1]).toFixed(1)} ${((x + w) * W).toFixed(1)},${Ye(r[1]).toFixed(1)}`; x += w; return p; }).join(' '); };
    const d = edit.dials[who];
    $('e-curve').innerHTML = `<svg viewBox="0 0 ${W} ${EH}" role="img" aria-label="Equity distribution">`
      + [0.25, 0.5, 0.75].map((v) => `<line class="gridl" x1="0" x2="${W}" y1="${Ye(v)}" y2="${Ye(v)}"/>`).join('')
      + `<line class="axis" x1="0" x2="${W}" y1="${Ye(0)}" y2="${Ye(0)}"/>${d.cap < 1 ? `<line class="ceiling" x1="0" x2="${W}" y1="${Ye(d.cap)}" y2="${Ye(d.cap)}"/>` : ''}`
      + `<polyline class="ghost" points="${steps(side.base)}"/><polyline class="wait" points="${steps(other.curve)}"/><polyline class="act" points="${steps(side.curve)}"/>`
      + KNOBS.map((x, k) => { const y = Math.min(1, Math.max(0, side.knobs[k] + d.curve[k])); return `<circle class="grab" data-grab="${k}" cx="${(x * W).toFixed(1)}" cy="${Ye(y).toFixed(1)}" r="7" tabindex="0" role="slider" aria-label="Equity at ${Math.round(100 * x)}% of the range" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct(y)}"/>`; }).join('') + '</svg>';
  }
  if (side && document.activeElement?.dataset?.slider == null) {
    const d = edit.dials[who]; const shown = { edge: pct(side.stats.equity), polar: pct(side.stats.polar), nuts: pct(side.stats.nuts), cap: d.cap < 1 ? pct(d.cap) : '\u2014' };
    $('e-sliders').innerHTML = Object.entries(SLIDERS).map(([key, [name, min, max, step]]) => `<label>${name}<output>${shown[key]}</output><input type="range" data-slider="${key}" min="${min}" max="${max}" step="${step}" value="${Math.round(100 * d[key])}" aria-label="${name}"></label>`).join('');
  } else if (side) {
    const d = edit.dials[who]; const shown = { edge: pct(side.stats.equity), polar: pct(side.stats.polar), nuts: pct(side.stats.nuts), cap: d.cap < 1 ? pct(d.cap) : '\u2014' };
    for (const input of $('e-sliders').querySelectorAll('[data-slider]')) input.previousElementSibling.textContent = shown[input.dataset.slider];
  }
}
$('e-oop').onclick = () => { edit.who = 'oop'; drawEditor(); }; $('e-ip').onclick = () => { edit.who = 'ip'; drawEditor(); };
$('e-cancel').onclick = closeEditor;
$('e-save').onclick = () => {
  if (!cellsOf(edit.oop)?.size || !cellsOf(edit.ip)?.size) return;
  // a new version after the one on screen; anything that came after it is dropped
  state.versions = state.versions.slice(0, state.at + 1);
  state.versions.push({ oop: edit.oop, ip: edit.ip, dials: JSON.parse(JSON.stringify(edit.dials)), curves: new Map() });
  closeEditor(); turnTo(state.versions.length - 1);
};
$('e-sliders').addEventListener('input', (ev) => { const key = ev.target.dataset?.slider; if (!key) return; edit.dials[edit.who][key] = Number(ev.target.value) / 100; preview(); });
// painting hands in and out
const editPaint = (ev) => {
  const cell = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.('#e-paint b'); if (!cell || !edit.stroke) return;
  const key = cell.dataset.key; if (edit.stroke.seen.has(key)) return;
  edit.stroke.seen.add(key);
  if (edit.stroke.add) edit.cells.set(key, 1); else edit.cells.delete(key);
  cell.className = edit.stroke.add ? 'on' : ''; cell.firstElementChild.style.height = edit.stroke.add ? '100%' : '0%';
};
$('e-paint').addEventListener('pointerdown', (ev) => { const cell = ev.target.closest('b'); if (!cell) return; ev.preventDefault(); edit.stroke = { add: !((edit.cells.get(cell.dataset.key) ?? 0) > 0), seen: new Set() }; editPaint(ev); });
window.addEventListener('pointermove', (ev) => {
  if (edit.stroke) editPaint(ev);
  if (edit.grab != null) {
    const svg = $('e-curve').querySelector('svg'); const box = svg.getBoundingClientRect();
    const y = Math.min(1, Math.max(0, 1 - (((ev.clientY - box.top) / box.height) * EH - PAD) / (EH - 2 * PAD)));
    edit.dials[edit.who].curve[edit.grab] = Math.round(100 * (y - edit.view[edit.who].knobs[edit.grab])) / 100;
    svg.querySelector(`[data-grab="${edit.grab}"]`)?.setAttribute('cy', String(Ye(y)));
    preview();
  }
});
const editRelease = () => {
  if (edit.stroke) { edit.stroke = null; edit[edit.who] = notationOf([...edit.cells.entries()].filter(([, share]) => share > 0).map(([key]) => key)); preview(); }
  if (edit.grab != null) { edit.grab = null; preview(); }
};
window.addEventListener('pointerup', editRelease); window.addEventListener('pointercancel', editRelease);
$('e-curve').addEventListener('pointerdown', (ev) => { const k = ev.target.dataset?.grab; if (k == null || !edit.view) return; ev.preventDefault(); edit.grab = +k; });
$('e-curve').addEventListener('keydown', (ev) => { const k = ev.target.dataset?.grab; const step = ev.key === 'ArrowUp' ? 0.02 : ev.key === 'ArrowDown' ? -0.02 : 0; if (k == null || !step) return; ev.preventDefault(); const c = edit.dials[edit.who].curve; c[+k] = Math.round(100 * (c[+k] + step)) / 100; preview(); });
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !$('editor').hidden) closeEditor(); });

begin();
