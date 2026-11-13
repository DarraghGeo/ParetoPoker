import { RangeManager } from 'poker-rangeman';
import { survey } from '../src/explain/river.js';
import { outline } from '../src/explain/outline.js';
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
  board: 'Td 9d 6h Qc 7s', pot: 100, stack: 200, bets: [0.33, 0.75, 1.5], raises: [2.5], maxRaises: 1, allIn: false,
  oop: '66+,A8s+,A5s-A4s,AJo+,K9s+,KQo,QTs+,JTs,96s+,85s+,75s+,65s,54s',
  ip: 'QQ-22,AQs-A2s,ATo+,K5s+,KJo+,Q8s+,J8s+,T7s+,96s+,86s+,75s+,64s+,53s+',
};
const state = {
  mode: 'spot', config: { ...DEFAULTS }, nodes: null, node: 0, decision: null, survey: null, hand: null, cell: null, detail: false, view: 'grid', split: false,
  spot: null, job: 0, status: '', stats: null,
  // Every saved edit of the ranges is a version; `at` is the one on screen
  versions: [], at: 0, slide: null,
  // Past a deal: the cards dealt after the spot's own board, and the deal being chosen (a chance node), if any
  dealt: [], pick: null, sub: null,
  // flop and turn reasons, as the worker has worked them out: `${node}|${dealt}|${combo}`
  told: new Map(), asked: new Set(),
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
  if (data.type === 'progress') { loading(data); state.status = `solving ${data.exploit < 100 ? `${data.exploit.toFixed(data.exploit < 1 ? 2 : 1)}%` : ''}`; $('state').textContent = state.status; $('state').dataset.busy = '1'; }
  if (data.type === 'error') { loaded(); state.status = ''; $('state').textContent = ''; delete $('state').dataset.busy; openSetup(state.sub ? { sub: true } : undefined); $('f-error').textContent = data.message; }
  if (data.type === 'subgame') {
    // The street re-solved on its own becomes the next version: the cards dealt, the ranges as they arrive
    state.versions = state.versions.slice(0, state.at + 1);
    state.versions.push({ id: ++versionId, oop: data.spot.oop, ip: data.spot.ip, dials: { oop: neutral(), ip: neutral() }, curves: new Map(), fixed: true, base: { board: data.spot.board, pot: data.spot.pot, stack: data.spot.stack, ...state.sub }, pos: { node: 0, dealt: [] } });
    state.sub = null; turnTo(state.versions.length - 1);
  }
  if (data.type === 'solved') {
    loaded(); state.nodes = data.nodes; state.told.clear(); state.asked.clear(); state.status = `${data.exploit.toFixed(2)}%`; delete $('state').dataset.busy;
    // back where this version was last looked at, if that place exists in it
    const pos = version().pos ?? { node: 0, dealt: [] }; const there = state.nodes[pos.node];
    const ok = there?.kind === 'decision' && pos.dealt.length >= there.round;
    state.dealt = ok ? [...pos.dealt] : []; state.pick = null; go(ok ? pos.node : 0);
  }
  if (data.type === 'decision') show(data.decision);
  if (data.type === 'told') { state.told.set(`${data.id}|${state.dealt.join(' ')}|${data.combo}`, data.told ?? { line: '', reasons: [], silent: data.error ?? '' }); renderWhy(); }
};
// ---- a solve that takes a while says so: what is being solved, how far along, and a way to stop ----
const load = { started: 0, first: null, timer: null, last: null };
function loading(data) {
  if (!load.started) { load.started = Date.now(); load.first = null; load.timer = setTimeout(() => { $('loader').hidden = false; }, 350); }
  if (data.exploit < Infinity && load.first == null) load.first = Math.max(data.exploit, data.target * 1.01);
  // accuracy closes in on the target by ratio, so the bar moves on a log scale
  const done = load.first == null ? 0 : Math.min(1, Math.max(0, Math.log(load.first / data.exploit) / Math.log(load.first / data.target)));
  load.last = Math.max(load.last ?? 0, done);
  $('l-title').innerHTML = `Solving the ${data.street} <span>${cardsHtml(conf().board)}</span>`;
  $('l-fill').style.width = `${(100 * load.last).toFixed(1)}%`;
  const seconds = Math.round((Date.now() - load.started) / 1000);
  $('l-now').textContent = data.exploit < Infinity ? `${data.exploit.toFixed(2)}% of pot, aiming for ${data.target}%  \u00b7  ${data.iterations} iterations  \u00b7  ${seconds}s` : 'Building the tree';
}
function loaded() { clearTimeout(load.timer); load.started = 0; load.last = null; $('loader').hidden = true; }
$('l-stop').onclick = () => worker.postMessage({ type: 'stop' });
const version = () => state.versions[state.at];
let versionId = 0;
/** The spot of the version on screen: the setup, with what a re-solved street changes. */
const conf = () => ({ ...state.config, ...(version()?.base ?? {}) });
const boardCards = (text) => text.match(/[2-9TJQKA][shdc]/g) ?? [];
/** Solve the version on screen. `keep`: stay on the same decision and hand (another version of the same spot). */
function solve(keep = false) {
  state.job++;
  if (!keep) { state.nodes = null; state.decision = null; state.survey = null; state.spot = null; state.hand = null; state.cell = null; state.dealt = []; state.pick = null; render(); }
  state.status = 'solving'; $('state').textContent = state.status;
  const v = version();
  worker.postMessage({ type: 'solve', job: state.job, key: v.id, config: { ...conf(), oop: v.oop, ip: v.ip, dials: v.dials } });
  const board = boardCards(conf().board);
  const job = state.job;
  state.spot = null;
  if (!v.fixed) profile(RangeManager, { oop: v.oop, ip: v.ip, board }).then((p) => { if (job === state.job) { state.spot = p; renderWhy(); } });
}
/** A new spot from setup: its ranges as given are the first version. */
function begin() {
  state.versions = [{ id: ++versionId, oop: state.config.oop, ip: state.config.ip, dials: { oop: neutral(), ip: neutral() }, curves: new Map(), pos: { node: 0, dealt: [] } }];
  state.at = 0;
  solve();
}
/** Go to another version: the stage slides away, the other one is solved and slides in. */
function turnTo(index) {
  if (index < 0 || index >= state.versions.length || index === state.at) return;
  const forward = index > state.at;
  version().pos = { node: state.node, dealt: [...state.dealt] };
  const same = conf().board === ({ ...state.config, ...(state.versions[index].base ?? {}) }).board;
  state.at = index;
  const stage = document.querySelector('.stage');
  stage.classList.add(forward ? 'out-left' : 'out-right');
  state.slide = forward ? 'in-right' : 'in-left';
  solve(same);
}
function go(id) {
  state.node = id; state.pick = null; $('theirs').hidden = true;
  worker.postMessage({ type: 'decision', job: state.job, id, dealt: state.dealt });
}
function show(decision) {
  state.decision = decision;
  state.survey = !decision ? null : decision.street === 'river' ? survey(decision) : outline(decision);
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
  const grid = state.view === 'grid'; const dealing = state.pick != null;
  $('range').hidden = !grid || dealing; $('dist').hidden = grid || dealing; $('deal').hidden = !dealing;
  if (dealing) renderDeal();
  $('state').textContent = state.status;
  $('versions').hidden = state.versions.length < 2;
  $('version').textContent = `${state.at + 1}/${state.versions.length}`;
  $('older').disabled = state.at === 0; $('newer').disabled = state.at >= state.versions.length - 1;
  const round = state.nodes?.[state.node]?.round ?? 0;
  // every board card is a button: tap one to change it
  const own = boardCards(conf().board); const shown = [...own, ...state.dealt.slice(0, round)];
  $('board').innerHTML = shown.map((c, i) => `<button type="button" class="s-${c[1]}${i >= own.length ? ' dealt' : ''}" data-board="${i}" aria-label="Change ${c}">${c[0]}${GLYPH[c[1]]}</button>`).join('');
  const d = state.decision;
  const strata = d ? strataOf(d.actions) : [];
  $('rule').innerHTML = d ? bar(state.survey.mix, strata) : '';
  // each part on its own: one that fails must not take the others with it
  for (const part of [() => renderLine(strata), () => renderStrip(strata), () => (grid ? renderGrid(strata) : renderDist()), () => renderCombos(strata), renderWhy]) {
    try { part(); } catch (error) { console.error(error); }
  }
}
function renderLine(strata) {
  const nodes = state.nodes;
  if (!nodes || !state.decision) { $('line').innerHTML = ''; return; }
  const path = []; let at = state.node;
  while (nodes[at].parent >= 0) { const parent = nodes[nodes[at].parent]; path.unshift(parent.kind === 'chance' ? { deal: parent.id, card: state.dealt[parent.round] } : { label: parent.edges[nodes[at].via].label, back: parent.id }); at = parent.id; }
  // an action that ends the street leads to a deal, and on to the next street's first decision
  const onward = (e) => { const child = nodes[e.child]; if (child.kind === 'decision') return `data-go="${e.child}"`; if (child.kind === 'chance' && nodes[child.edges[0]?.child]?.kind === 'decision') return `data-deal="${child.id}"`; return 'disabled'; };
  const opensStreet = here => here.parent >= 0 && nodes[here.parent].kind === 'chance';
  const here = nodes[state.node];
  const icon = (id, label, path, extra = '') => `<button type="button" class="icon" id="${id}" aria-label="${label}" ${extra}><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">${path}</svg></button>`;
  const stroke = 'fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"';
  // the line so far and the icons stay put; only the choices at this decision scroll
  $('line').innerHTML = `<div class="trail">${path.map((p) => (p.deal != null ? `<button type="button" class="crumb card" data-deal="${p.deal}" aria-label="Change the card dealt">${cardsHtml(p.card ?? '')}</button>` : `<button type="button" class="crumb" data-go="${p.back}">${esc(p.label)}</button>`) + '<span class="sep">/</span>').join('')}<span class="who">${here.seat === 'oop' ? 'OOP' : 'IP'}</span></div>`
    + `<div class="acts">${here.edges.map((e, k) => `<button type="button" class="act" ${onward(e)}><i class="sw" style="background:var(${COLORS[strata[k]]})"></i>${esc(e.label)}</button>`).join('')}</div>`
    + '<div class="tools">'
    + icon('villain', here.seat === 'oop' ? 'In position\'s range' : 'Out of position\'s range', `<circle cx="8" cy="5.2" r="2.6" ${stroke}/><path d="M2.8 13.6c.6-2.6 2.6-4 5.2-4s4.6 1.4 5.2 4" ${stroke}/>`)
    + (version().fixed ? '' : icon('edit', 'Edit ranges', `<path d="M3 13l.6-2.8L10.9 3a1.1 1.1 0 0 1 1.6 0l.5.5a1.1 1.1 0 0 1 0 1.6L5.8 12.4z" ${stroke}/>`))
    + icon('split', state.split ? 'One bar' : 'By made hand', state.split ? `<path d="M2 6.5h12v3H2z" ${stroke}/>` : `<path d="M2 3h12M2 6.3h9M2 9.7h12M2 13h6" ${stroke}/>`, `aria-pressed="${state.split}"`)
    + icon('view', state.view === 'grid' ? 'Equity distribution' : 'Grid', state.view === 'grid' ? `<path d="M2 13c3 0 3-4 6-5s3-5 6-5" ${stroke}/>` : `<path d="M2.5 2.5h11v11h-11zM6.2 2.5v11M9.8 2.5v11M2.5 6.2h11M2.5 9.8h11" ${stroke}/>`)
    + '</div>';
  $('f-sub').hidden = !opensStreet(here);
}
/** Choosing the card dealt: every card still in the deck, a row a suit. */
function renderDeal() {
  const chance = state.nodes[state.pick]; const gone = new Set([...boardCards(conf().board), ...state.dealt.slice(0, chance.round)]);
  const now = state.dealt[chance.round];
  $('deal').innerHTML = cardGrid(gone, now);
}
/** Every card, a row a suit; the ones in use cannot be taken. */
function cardGrid(gone, now) {
  return ['s', 'h', 'd', 'c'].map((suit) => `<div>${[...RANKS].map((rank) => { const card = rank + suit; return `<button type="button" class="s-${suit}" data-card="${card}" ${gone.has(card) && card !== now ? 'disabled' : ''} aria-pressed="${card === now}" aria-label="${card}">${rank}${GLYPH[suit]}</button>`; }).join('')}</div>`).join('');
}
// ---- the other player's range at this decision: which hands, and how much of each ----
function showVillain(anchor) {
  const pop = $('theirs'); if (!pop.hidden) { pop.hidden = true; return; }
  const cells = new Map();
  for (const v of state.decision?.villain ?? []) { const key = cellOf(v.name); cells.set(key, (cells.get(key) ?? 0) + v.weight); }
  let html = '';
  for (let i = 0; i < 13; i++) for (let j = 0; j < 13; j++) {
    const share = Math.min(1, (cells.get(`${i},${j}`) ?? 0) / (i === j ? 6 : i < j ? 4 : 12));
    html += `<b style="grid-column:${j + 1 + (j > 4) + (j > 8)};grid-row:${i + 1 + (i > 4) + (i > 8)}" title="${cellName(i, j)}"><i style="height:${Math.round(100 * share)}%"></i></b>`;
  }
  pop.innerHTML = `<div class="paint">${html}</div>`; pop.hidden = false;
  const box = anchor.getBoundingClientRect(); const width = pop.offsetWidth;
  pop.style.top = `${box.bottom + 8}px`; pop.style.left = `${Math.max(12, Math.min(box.left + box.width / 2 - width / 2, innerWidth - width - 12))}px`;
}
document.addEventListener('pointerdown', (ev) => { if (!$('theirs').hidden && !ev.target.closest('#theirs') && !ev.target.closest('#villain')) $('theirs').hidden = true; });
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') $('theirs').hidden = true; });
// ---- the board: tap a card, pick another from the cards that drop down under it ----
let swapping = null;
const closeCards = () => { swapping = null; $('cardpick').hidden = true; };
$('board').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-board]'); if (!b) return;
  const i = +b.dataset.board; if (swapping === i) { closeCards(); return; }
  const own = boardCards(conf().board); const round = state.nodes?.[state.node]?.round ?? 0; const all = [...own, ...state.dealt.slice(0, round)];
  swapping = i;
  const pick = $('cardpick'); pick.innerHTML = cardGrid(new Set(all), all[i]); pick.hidden = false;
  const box = b.getBoundingClientRect(); const width = pick.offsetWidth;
  pick.style.top = `${box.bottom + 10}px`; pick.style.left = `${Math.max(12, Math.min(box.left, innerWidth - width - 12))}px`;
});
$('cardpick').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-card]'); if (!b || swapping == null) return;
  const own = boardCards(conf().board); const i = swapping; closeCards();
  if (i >= own.length) { state.dealt[i - own.length] = b.dataset.card; state.hand = null; state.cell = null; go(state.node); return; }
  // one of the spot's own cards: a new spot, solved again
  own[i] = b.dataset.card;
  const v = version();
  if (v.base) { v.base = { ...v.base, board: own.join(' ') }; v.id = ++versionId; v.pos = { node: 0, dealt: [] }; state.hand = null; solve(); return; }
  state.config.board = own.join(' '); remember(); state.node = 0; state.hand = null; begin();
});
document.addEventListener('pointerdown', (ev) => { if (swapping != null && !ev.target.closest('#cardpick') && !ev.target.closest('#board')) closeCards(); });
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') closeCards(); });
$('deal').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-card]'); if (!b || state.pick == null) return;
  const chance = state.nodes[state.pick];
  state.dealt = [...state.dealt.slice(0, chance.round), b.dataset.card];
  state.hand = null; state.cell = null; go(chance.edges[0].child);
});
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
  const rows = !s || !picked ? [] : state.view === 'grid' ? s.rows.filter((r) => cellOf(r.hand.name) === state.cell) : s.levels.get(picked.hand.strength)?.rows ?? s.rows.filter((r) => cellOf(r.hand.name) === cellOf(picked.hand.name));
  $('combos').innerHTML = [...rows].sort((x, y) => y.hand.weight - x.hand.weight).map((r) => `<button type="button" data-hand="${r.hand.name}" aria-pressed="${state.hand === r.hand.name}"><span>${cardsHtml(r.hand.name)}</span><span class="bar">${bar(r.hand.strategy, strata)}</span></button>`).join('');
}
/** The two equity curves at this decision: the player to act and, in the other colour, the other range. */
function renderDist() {
  const s = state.survey; if (!s) { $('dist').innerHTML = ''; return; }
  const d = state.decision; const DH = 350;
  // the same horizontal scale as the strip above: the full width
  const Xd = (x) => x * W;
  const Yd = (y) => DH - PAD - y * (DH - 2 * PAD);
  const steps = (list) => { const total = list.reduce((t, r) => t + r.w, 0); let x = 0; const pts = []; for (const r of list) { const w = r.w / total; pts.push(`${Xd(x).toFixed(1)},${Yd(r.e).toFixed(1)} ${Xd(x + w).toFixed(1)},${Yd(r.e).toFixed(1)}`); r.mid = x + w / 2; x += w; } return pts.join(' '); };
  const mine = handsInOrder(s).map((r) => ({ w: r.hand.weight, e: r.equity, name: r.hand.name }));
  // his hands against the range to act, with the cards each removes
  const his = d.villain.map((v) => { if (v.equity !== undefined) return { w: v.weight, e: Number.isNaN(v.equity) ? 0 : v.equity }; let mass = 0, win = 0; for (const r of s.rows) { const h = r.hand; if (v.cards && h.cards && (v.cards[0] === h.cards[0] || v.cards[0] === h.cards[1] || v.cards[1] === h.cards[0] || v.cards[1] === h.cards[1])) continue; mass += h.weight; win += h.weight * (v.strength > h.strength ? 1 : v.strength < h.strength ? 0 : 0.5); } return { w: v.weight, e: mass > 0 ? win / mass : 0 }; }).sort((a, b) => a.e - b.e);
  const minePts = steps(mine); const hisPts = steps(his);
  const pick = mine.find((r) => r.name === state.hand);
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
const handsInOrder = (s) => [...s.rows].sort((a, b) => (a.hand.strength ?? 0) - (b.hand.strength ?? 0) || a.equity - b.equity || (a.hand.name < b.hand.name ? -1 : 1));
function renderWhy() {
  const s = state.survey; const row = s?.byName.get(state.hand);
  // before the river there is the hand and what it does; the reasons are a river matter for now
  let told = !s || !state.hand || !row ? null : { name: row.hand.name, strategy: row.hand.strategy, equity: row.equity, line: '', reasons: [] };
  // the reasons come from the worker on every street: only what has been proven is said (research/proof/PROOF.md)
  if (told && row) {
    // the reasons come from the worker: asked for once a hand, shown when they arrive
    const key = `${state.node}|${state.dealt.join(' ')}|${row.hand.id}`; const got = state.told.get(key);
    if (got) told = { ...told, line: got.line, reasons: got.silent ? [...got.reasons, { text: got.silent, quiet: true }] : got.reasons };
    else { told = { ...told, reasons: [{ text: 'Working out the reasons\u2026', quiet: true }] }; if (!state.asked.has(key)) { state.asked.add(key); worker.postMessage({ type: 'explain', job: state.job, id: state.node, dealt: state.dealt, combo: row.hand.id }); } }
  }
  if (!told) { $('why').innerHTML = ''; return; }
  const d = state.decision; const strata = strataOf(d.actions);
  const title = d.abstract ? `${pct(told.equity)}%` : cardsHtml(told.name);
  const reasons = [...told.reasons];
  // the spot sentence is about the ranges as they start, so it stays with the street they start on
  if (state.spot?.text && !d.abstract && !(state.nodes?.[state.node]?.round > 0)) reasons.push({ text: state.spot.text });
  $('why').innerHTML = `<h2>${title}</h2>`
    + `<div class="mix"><span class="bar">${bar(told.strategy, strata)}</span><div class="nums">${d.actions.map((a, k) => (told.strategy[k] > 0.004 ? `<span><i class="sw" style="background:var(${COLORS[strata[k]]})"></i>${esc(a.label)} ${pct(told.strategy[k])}</span>` : '')).join('')}</div></div>`
    + (told.line ? `<p class="lead">${esc(told.line)}</p>` : '')
    + reasons.map((r) => `<p${r.quiet ? ' class="quiet"' : ''}>${esc(r.text)}</p>`).join('');
}

const W = 560, PAD = 8;
$('line').addEventListener('click', (ev) => {
  if (ev.target.closest('#edit')) { openEditor(); return; }
  if (ev.target.closest('#villain')) { showVillain(ev.target.closest('#villain')); return; }
  const deal = ev.target.closest('[data-deal]'); if (deal) { state.pick = +deal.dataset.deal; render(); return; }
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
function openSetup(how) {
  // from a street's first decision: only the betting is asked, the board and the ranges are what arrived there
  const sub = !!how?.sub; $('drawer').classList.toggle('sub', sub); $('drawer').dataset.sub = sub ? '1' : '';
  const c = sub ? conf() : state.config;
  $('f-board').value = c.board; $('f-pot').value = c.pot; $('f-stack').value = c.stack;
  $('f-bets').value = (Array.isArray(c.bets[0]) ? c.bets : [c.bets]).map((list) => list.map((b) => Math.round(100 * b)).join(' ')).join(' / '); $('f-raise').value = c.raises.join(' '); $('f-max').value = c.maxRaises; $('f-allin').checked = !!c.allIn;
  draft.oop = c.oop; draft.ip = c.ip; showSide(draft.side);
  $('drawer').hidden = false; $('scrim').hidden = false;
  // Focus the drawer itself, never a field: on a phone a focused field brings up the keyboard and zooms the page
  $('drawer').focus({ preventScroll: true });
}
const closeSetup = () => { $('drawer').hidden = true; $('scrim').hidden = true; $('f-error').textContent = ''; };
$('open-setup').onclick = () => openSetup(); $('f-sub').onclick = () => openSetup({ sub: true }); $('scrim').onclick = () => { closeSetup(); closeEditor(); };
$('state').onclick = () => { if ($('state').dataset.busy) worker.postMessage({ type: 'stop' }); };
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !$('drawer').hidden) closeSetup(); });
$('drawer').addEventListener('submit', (ev) => {
  ev.preventDefault();
  // one list of sizes for every street, or one list a street, apart by a slash
  const lists = $('f-bets').value.split('/').map((part) => part.split(/[\s,]+/).map(Number).filter((x) => x > 0).map((x) => x / 100)).filter((list) => list.length);
  const bets = lists.length > 1 ? lists : lists[0] ?? [];
  const pot = Number($('f-pot').value); const stack = Number($('f-stack').value);
  const raises = $('f-raise').value.split(/[\s,x]+/i).map(Number).filter((x) => x > 1);
  const maxRaises = Math.max(0, Math.min(4, Math.round(Number($('f-max').value) || 0)));
  const board = ($('f-board').value.match(/[2-9TJQKAtjqka][shdcSHDC]/g) ?? []).map((c) => c[0].toUpperCase() + c[1].toLowerCase());
  if (!(pot > 0) || !(stack >= 0) || !bets.length) { $('f-error').textContent = 'Pot, stack and at least one bet size are needed.'; return; }
  const betting = { bets, raises: maxRaises > 0 ? raises : [], maxRaises: raises.length ? maxRaises : 0, allIn: $('f-allin').checked };
  if ($('drawer').dataset.sub) { state.sub = betting; closeSetup(); state.status = 'solving'; $('state').textContent = state.status; worker.postMessage({ type: 'subgame', job: state.job, id: state.node, dealt: state.dealt }); return; }
  if (board.length < 3 || board.length > 5 || new Set(board).size !== board.length) { $('f-error').textContent = 'Three, four or five board cards are needed.'; return; }
  if ((!cellsOf(draft.oop)?.size || !cellsOf(draft.ip)?.size)) { $('f-error').textContent = 'Both ranges need hands.'; return; }
  Object.assign(state.config, { pot, stack, ...betting, board: board.join(' '), oop: draft.oop.trim(), ip: draft.ip.trim() });
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
const SLIDERS = { edge: ['Equity', -100, 100, 1], polar: ['Polar', -100, 100, 1], nuts: ['Nuts', 0, 200, 1], cap: ['Cap', 50, 100, 1] };
const edit = { who: 'oop', oop: '', ip: '', dials: null, view: null, id: 0, timer: null, cells: new Map() };
const EH = 300;
const Ye = (y) => EH - PAD - y * (EH - 2 * PAD);
function openEditor() {
  const v = version();
  Object.assign(edit, { who: state.decision?.seat ?? 'oop', oop: v.oop, ip: v.ip, dials: JSON.parse(JSON.stringify(v.dials)), view: null, built: null, busy: false, stale: false });
  $('editor').hidden = false; $('scrim').hidden = false; $('editor').focus({ preventScroll: true });
  drawEditor(); preview();
}
function closeEditor() { if ($('editor').hidden) return; $('editor').hidden = true; $('scrim').hidden = true; }
/** Ask for the picture of the ranges as they stand. One request at a time: while one is out, the latest change waits for it. */
function preview() {
  if (edit.busy) { edit.stale = true; return; }
  edit.busy = true; edit.stale = false;
  worker.postMessage({ type: 'preview', id: ++edit.id, config: { board: conf().board, oop: edit.oop, ip: edit.ip, dials: edit.dials } });
}
function onPreview(data) {
  edit.busy = false;
  if (!data.error) { edit.view = data.sides; drawEditor(); }
  if (edit.stale) preview();
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
  if (side) {
    const steps = (list) => { const total = list.reduce((t, r) => t + r[0], 0); let x = 0; return list.map((r) => { const w = r[0] / total; const p = `${(x * W).toFixed(1)},${Ye(r[1]).toFixed(1)} ${((x + w) * W).toFixed(1)},${Ye(r[1]).toFixed(1)}`; x += w; return p; }).join(' '); };
    const d = edit.dials[who];
    $('e-curve').innerHTML = `<svg viewBox="0 0 ${W} ${EH}" role="img" aria-label="Equity distribution">`
      + [0.25, 0.5, 0.75].map((v) => `<line class="gridl" x1="0" x2="${W}" y1="${Ye(v)}" y2="${Ye(v)}"/>`).join('')
      + `<line class="axis" x1="0" x2="${W}" y1="${Ye(0)}" y2="${Ye(0)}"/>${d.cap < 1 ? `<line class="ceiling" x1="0" x2="${W}" y1="${Ye(d.cap)}" y2="${Ye(d.cap)}"/>` : ''}`
      + `<polyline class="ghost" points="${steps(side.base)}"/><polyline class="wait" points="${steps(other.curve)}"/><polyline class="act" points="${steps(side.curve)}"/>`
      + KNOBS.map((x, k) => { const y = Math.min(1, Math.max(0, side.knobs[k] + d.curve[k])); return `<circle class="grab" data-grab="${k}" cx="${(x * W).toFixed(1)}" cy="${Ye(y).toFixed(1)}" r="7" tabindex="0" role="slider" aria-label="Equity at ${Math.round(100 * x)}% of the range" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct(y)}"/>`; }).join('') + '</svg>';
  }
  if (side && edit.built !== who) {
    edit.built = who;
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
  state.versions.push({ id: ++versionId, oop: edit.oop, ip: edit.ip, dials: JSON.parse(JSON.stringify(edit.dials)), curves: new Map(), base: version().base, pos: { node: state.node, dealt: [...state.dealt] } });
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
    edit.dials[edit.who].curve[edit.grab] = Math.round(1000 * (y - edit.view[edit.who].knobs[edit.grab])) / 1000;
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
