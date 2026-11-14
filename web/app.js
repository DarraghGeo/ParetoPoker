import { RangeManager } from 'poker-rangeman';
import { survey } from '../src/explain/river.js';
import { outline } from '../src/explain/outline.js';
import { profile } from '../src/explain/profile.js';
import { KNOBS, isNeutral, neutral } from '../src/warp/reshape.js';
import { $, COLORS, COPY_ICON, DEFAULTS, copied, copyText, studyUrl, GLYPH, RANKS, bar, cardsHtml, cellName, cellOf, esc, pct, strataOf } from './common.js';

/** The action chart's forms: one bar; a row for each made hand; a ladder of both ranges on one scale. */
const CHARTS = ['single', 'split', 'ladder'];
const state = {
  mode: 'spot', config: { ...DEFAULTS }, nodes: null, node: 0, decision: null, survey: null, hand: null, cell: null, detail: false, view: 'grid', chart: 'single',
  spot: null, job: 0, status: '', stats: null,
  // Every saved edit of the ranges is a version; `at` is the one on screen
  versions: [], at: 0, slide: null,
  // Past a deal: the cards dealt after the spot's own board, and the deal being chosen (a chance node), if any
  dealt: [], pick: null, sub: null,
  // flop and turn reasons, as the worker has worked them out: `${node}|${dealt}|${combo}`
  told: new Map(), asked: new Set(),
  // the analytical look at a hand, likewise, and which of the two the panel shows
  looked: new Map(), tab: 'why',
};
try { const saved = JSON.parse(localStorage.getItem('pareto') ?? 'null'); if (saved?.config) Object.assign(state.config, saved.config);
  // an earlier visit saved one raise size as `raise`
  if (!Array.isArray(state.config.raises)) state.config.raises = state.config.raise > 0 ? [state.config.raise] : [];
  delete state.config.raise; state.detail = !!saved?.detail; if (saved?.view === 'curve') state.view = 'curve'; state.chart = CHARTS.includes(saved?.chart) ? saved.chart : saved?.split ? 'split' : 'single'; } catch { /* first visit */ }
// A spot handed over in the address (Train's "open in Study"): it becomes the setup, and the page opens at its decision and hand
try {
  const q = new URLSearchParams(location.search);
  const board = (q.get('board') ?? '').match(/[2-9TJQKA][shdc]/g) ?? [];
  if (board.length >= 3 && board.length <= 5 && new Set(board).size === board.length) {
    const c = { board: board.join(' ') };
    const num = (key, ok) => { const x = Number(q.get(key)); if (q.has(key) && Number.isFinite(x) && ok(x)) c[key] = x; };
    num('pot', (x) => x > 0); num('stack', (x) => x >= 0);
    const lists = (q.get('bets') ?? '').split('/').map((part) => part.split(',').map(Number).filter((x) => x > 0).map((x) => x / 100)).filter((list) => list.length);
    if (lists.length) c.bets = lists.length > 1 ? lists : lists[0];
    if (q.has('raises')) c.raises = q.get('raises').split(',').map(Number).filter((x) => x > 1);
    if (q.has('max')) c.maxRaises = Math.max(0, Math.min(4, Math.round(Number(q.get('max')) || 0)));
    if (q.has('allin')) c.allIn = q.get('allin') === '1';
    for (const side of ['oop', 'ip']) if (q.get(side)?.trim()) c[side] = q.get(side).trim();
    c.lite = q.get('lite') === '1';
    Object.assign(state.config, c);
    state.open = { line: (q.get('line') ?? '').split(',').filter(Boolean), dealt: (q.get('dealt') ?? '').match(/[2-9TJQKA][shdc]/g) ?? [], hand: /^([2-9TJQKA][shdc]){2}$/.test(q.get('hand') ?? '') ? q.get('hand') : null, resolve: q.get('resolve') === '1' };
  }
} catch { /* an address that cannot be read opens the saved spot */ }
const remember = () => { try { localStorage.setItem('pareto', JSON.stringify({ config: state.config, detail: state.detail, view: state.view, chart: state.chart })); } catch { /* private window */ } };

// ---- the solver, in a worker ----
const worker = new Worker(new URL('./worker.js', import.meta.url));
worker.onmessage = ({ data }) => {
  if (data.type === 'preview') { onPreview(data); return; }
  if (data.type === 'fits') { onFits(data); return; }
  if (data.job !== state.job) return;
  if (data.type === 'progress') { loading(data); state.status = data.lite ? 'solving lite' : `solving ${data.exploit < 100 ? `${data.exploit.toFixed(data.exploit < 1 ? 2 : 1)}%` : ''}`; $('state').textContent = state.status; $('state').dataset.busy = '1'; }
  if (data.type === 'error') { loaded(); state.status = ''; $('state').textContent = ''; delete $('state').dataset.busy; openSetup(state.sub ? { sub: true } : undefined); $('f-error').textContent = data.message; }
  if (data.type === 'subgame') {
    // The street re-solved on its own becomes the next version: the cards dealt, the ranges as they arrive
    state.versions = state.versions.slice(0, state.at + 1);
    state.versions.push({ id: ++versionId, oop: data.spot.oop, ip: data.spot.ip, dials: { oop: neutral(), ip: neutral() }, curves: new Map(), fixed: true, base: { board: data.spot.board, pot: data.spot.pot, stack: data.spot.stack, ...state.sub, lite: false }, pos: { node: 0, dealt: [] } });
    state.sub = null; turnTo(state.versions.length - 1);
  }
  if (data.type === 'solved') {
    loaded(); state.nodes = data.nodes; state.told.clear(); state.asked.clear(); state.looked.clear(); state.status = `${data.lite ? 'lite ' : ''}${data.exploit.toFixed(2)}%`; delete $('state').dataset.busy;
    // back where this version was last looked at, if that place exists in it
    if (state.open) {
      // the decision the address names: its line walked from the first decision, as far as this tree has it
      let at = 0; let again = null;
      const cards = []; const { line, dealt } = state.open;
      for (let i = 0; i < line.length; i++) {
        const edge = state.nodes[at].edges.find((e) => e.label === line[i]); if (!edge) break;
        const next = state.nodes[edge.child];
        // an action that ends the street: on through the card the address gives for it
        if (next.kind === 'chance' && dealt[next.round] && state.nodes[next.edges[0]?.child]?.kind === 'decision') {
          cards[next.round] = dealt[next.round]; at = next.edges[0].child;
          // a spot from Train: each street after the first is solved again for the ranges that arrive, and the rest of the line is walked in that solve
          if (state.open.resolve) { again = { ...state.open, line: line.slice(i + 1), dealt: dealt.slice(next.round + 1) }; break; }
          continue;
        }
        if (next.kind !== 'decision') break;
        at = next.id;
      }
      version().pos = { node: at, dealt: cards };
      if (!again && state.open.hand) { state.hand = state.open.hand; state.cell = cellOf(state.open.hand); }
      state.open = again;
      if (again) state.onward = { id: at, dealt: cards };
    }
    const pos = version().pos ?? { node: 0, dealt: [] }; const there = state.nodes[pos.node];
    const ok = there?.kind === 'decision' && pos.dealt.length >= there.round;
    state.dealt = ok ? [...pos.dealt] : []; state.pick = null; go(ok ? pos.node : 0);
    if (state.onward) {
      const { id, dealt } = state.onward; state.onward = null;
      const c = state.config; const lists = Array.isArray(c.bets[0]) ? c.bets : [c.bets]; const left = 3 - boardCards(conf().board).length - dealt.length + 3;
      state.sub = { bets: lists.length > left ? lists.slice(-left) : c.bets, raises: c.raises, maxRaises: c.maxRaises, allIn: c.allIn };
      worker.postMessage({ type: 'subgame', job: state.job, id, dealt });
    }
  }
  if (data.type === 'decision') show(data.decision);
  if (data.type === 'looked') { state.looked.set(`${data.id}|${state.dealt.join(' ')}|${data.combo ?? null}`, data.look ?? { types: [], spread: null }); renderWhy(); }
  if (data.type === 'told') { state.told.set(`${data.id}|${state.dealt.join(' ')}|${data.combo}`, data.told ?? { line: '', reasons: [], silent: data.error ?? '' }); renderWhy(); }
};
// ---- a solve that takes a while says so: what is being solved, how far along, and a way to stop ----
const load = { started: 0, first: null, timer: null, last: null };
function loading(data) {
  if (!load.started) { load.started = Date.now(); load.first = null; load.timer = setTimeout(() => { $('loader').hidden = false; }, 350); }
  if (data.lite) {
    load.last = Math.max(load.last ?? 0, data.done);
    $('l-title').innerHTML = `Solving the ${data.street} <span>${cardsHtml(conf().board)}</span>`;
    $('l-fill').style.width = `${(100 * load.last).toFixed(1)}%`;
    $('l-now').textContent = `Lite${data.moving > 0 ? `  \u00b7  first decisions still moving ${(100 * data.moving).toFixed(1)}%` : ''}  \u00b7  ${data.iterations} iterations  \u00b7  ${Math.round((Date.now() - load.started) / 1000)}s`;
    return;
  }
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
  // no hand is picked for you: the range comes first. A hand picked earlier stays while it is still in the range
  if (!state.survey || !state.survey.byName.has(state.hand)) { state.hand = null; state.cell = null; }
  render();
  if (state.slide) {
    // the other version comes in from the side it lives on
    const stage = document.querySelector('.stage'); const from = state.slide; state.slide = null;
    stage.classList.remove('out-left', 'out-right'); stage.classList.add(from);
    requestAnimationFrame(() => requestAnimationFrame(() => stage.classList.remove(from)));
  }
}

// ---- drawing ----
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
  // (where the spot starts before the river and no card has been dealt along the line, faint boxes mark the turn and river: tap one to add the next card)
  const empty = round === 0 ? 5 - own.length : 0;
  $('board').innerHTML = shown.map((c, i) => `<button type="button" class="s-${c[1]}${i >= own.length ? ' dealt' : ''}" data-board="${i}" aria-label="Change ${c}${i >= 3 && i < own.length ? '; double tap to remove' : ''}">${c[0]}${GLYPH[c[1]]}</button>`).join('')
    + Array.from({ length: empty }, (_, k) => `<button type="button" class="slot" data-board="${own.length}" data-add="1" aria-label="Add the ${own.length + k === 3 ? 'turn' : 'river'}"${k ? ' data-later="1"' : ''}></button>`).join('');
  const d = state.decision;
  const strata = d ? strataOf(d.actions) : [];
  $('rule').innerHTML = d ? bar(state.survey.mix, strata) : '';
  // each part on its own: one that fails must not take the others with it
  for (const part of [() => renderLine(strata), () => renderStrip(strata), () => (grid ? renderGrid(strata) : renderDist()), () => renderCombos(strata), renderWhy]) {
    try { part(); } catch (error) { console.error(error); }
  }
}
/** The spot on screen, written out to paste elsewhere: the board, the line, the chips, what the range and the hand picked do, the ranges and the betting, and the address that opens it here. */
function spotText() {
  const d = state.decision; const nodes = state.nodes; if (!d || !nodes) return '';
  const c = conf(); const v = version(); const here = nodes[state.node];
  const num = (x) => String(Math.round(10 * x) / 10);
  // the line: each action with who took it, each card as it was dealt
  const told = []; const labels = []; let at = state.node;
  while (nodes[at].parent >= 0) { const parent = nodes[nodes[at].parent]; if (parent.kind === 'chance') told.unshift(`dealt ${state.dealt[parent.round] ?? '?'}`); else { const label = parent.edges[nodes[at].via].label; told.unshift(`${parent.seat === 'oop' ? 'OOP' : 'IP'} ${label}`); labels.unshift(label); } at = parent.id; }
  const dealt = state.dealt.slice(0, here.round);
  const mix = (list) => d.actions.map((a, k) => (list[k] > 0.004 ? `${a.label} ${pct(list[k])}%` : '')).filter(Boolean).join(', ');
  const row = state.survey?.byName.get(state.hand);
  const neutralDials = isNeutral(v.dials?.oop) && isNeutral(v.dials?.ip);
  const range = (side) => (typeof v[side] === 'string' ? `${v[side]}${isNeutral(v.dials?.[side]) ? '' : ' (reshaped in the editor)'}` : 'as it arrives at this street');
  const me = d.seat; const him = me === 'oop' ? 'ip' : 'oop'; const name = (seat) => (seat === 'oop' ? 'OOP' : 'IP');
  const held = (list) => Math.round(list.reduce((t, h) => t + h.weight, 0));
  const lists = Array.isArray(c.bets[0]) ? c.bets : [c.bets];
  const linked = typeof v.oop === 'string' && typeof v.ip === 'string' && neutralDials && !v.base;
  const rows = [
    `Board: ${[...boardCards(c.board), ...dealt].join(' ')} (${d.street})`,
    `To act: ${name(me)}, ${told.length ? `after ${told.join(', ')}` : 'first to act'}`,
    `Pot: ${num(d.pot)}${d.toCall > 0 ? `, to call ${num(d.toCall)}` : ''}, behind ${num(c.stack - here.invested[me === 'oop' ? 0 : 1])} (started at pot ${num(c.pot)}, stacks ${num(c.stack)})`,
    `Actions: ${d.actions.map((a) => a.label).join(', ')}`,
    `The range plays: ${mix(state.survey.mix)}`,
    row ? `Hand: ${row.hand.name}, which plays ${mix(row.hand.strategy)}` : '',
    `${name(me)}'s starting range: ${range(me)} (${held(d.hands)} combinations reach this decision)`,
    `${name(him)}'s starting range: ${range(him)} (${held(d.villain)} combinations reach this decision)`,
    `Bet sizes, % of pot: ${lists.map((list) => list.map((b) => Math.round(100 * b)).join(' ')).join(' / ')}`,
    `Raises: ${c.raises.length && c.maxRaises > 0 ? `${c.raises.map((r) => `${r}x`).join(' ')}, ${c.maxRaises} allowed` : 'none'}; all-in ${c.allIn ? 'offered' : 'not offered'}`,
    `Solved ${c.lite ? 'lite (these sizes on the first street, one bet size after it), ' : ''}to ${state.status.replace('lite ', '')} of the pot`,
    linked ? new URL(studyUrl({ ...c, oop: v.oop, ip: v.ip }, c.board, { line: labels, dealt, hand: row?.hand.name ?? null, lite: !!c.lite }), location.href).href : '',
  ];
  return rows.filter(Boolean).join('\n');
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
    // the button shows the form the chart turns to next
    + icon('split', ...{ single: ['Action chart, split by made hand', `<path d="M2 3h12M2 6.3h9M2 9.7h12M2 13h6" ${stroke}/>`], split: ['Action chart, ladder: both ranges on one scale', `<path d="M2 5.5h6M10.5 5.5H14M2 10.5h2.5M7 10.5h7" ${stroke}/>`], ladder: ['Action chart, one bar', `<path d="M2 6.5h12v3H2z" ${stroke}/>`] }[state.chart])
    + icon('view', state.view === 'grid' ? 'Equity distribution' : 'Grid', state.view === 'grid' ? `<path d="M2 13c3 0 3-4 6-5s3-5 6-5" ${stroke}/>` : `<path d="M2.5 2.5h11v11h-11zM6.2 2.5v11M9.8 2.5v11M2.5 6.2h11M2.5 9.8h11" ${stroke}/>`)
    + '</div>';
  $('f-sub').hidden = !opensStreet(here);
  // the pen is for ranges that were typed or painted; a re-solved street has none to edit
  $('edit').hidden = !!version().fixed;
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
let swapping = null; let adding = false; let tapped = { i: -1, at: 0 };
const closeCards = () => { swapping = null; adding = false; $('cardpick').hidden = true; };
/** The spot's own board changes: a new spot, solved again. */
function setBoard(own) {
  const v = version();
  if (v.base) { v.base = { ...v.base, board: own.join(' ') }; v.id = ++versionId; v.pos = { node: 0, dealt: [] }; state.hand = null; state.cell = null; solve(); return; }
  state.config.board = own.join(' '); remember(); state.node = 0; state.hand = null; state.cell = null; begin();
}
$('board').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-board]'); if (!b) return;
  const i = +b.dataset.board; const own = boardCards(conf().board);
  // the turn or the river tapped twice quickly: it comes off the board, and the river with the turn
  const twice = tapped.i === i && Date.now() - tapped.at < 450; tapped = { i, at: Date.now() };
  if (twice && !b.dataset.add && i >= 3 && i < own.length) { closeCards(); tapped = { i: -1, at: 0 }; setBoard(own.slice(0, i)); return; }
  if (swapping === i && adding === !!b.dataset.add) { closeCards(); return; }
  adding = !!b.dataset.add; const round = state.nodes?.[state.node]?.round ?? 0; const all = [...own, ...state.dealt.slice(0, round)];
  swapping = i;
  const pick = $('cardpick'); pick.innerHTML = cardGrid(new Set(all), all[i]); pick.hidden = false;
  const box = b.getBoundingClientRect(); const width = pick.offsetWidth;
  pick.style.top = `${box.bottom + 10}px`; pick.style.left = `${Math.max(12, Math.min(box.left, innerWidth - width - 12))}px`;
});
$('cardpick').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-card]'); if (!b || swapping == null) return;
  const own = boardCards(conf().board); const i = swapping; const add = adding; closeCards();
  // an empty box: the next card of the spot's own board
  if (add) { setBoard([...own, b.dataset.card]); return; }
  if (i >= own.length) { state.dealt[i - own.length] = b.dataset.card; state.hand = null; state.cell = null; go(state.node); return; }
  own[i] = b.dataset.card; setBoard(own);
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
  const his = d.villain.map((v) => ({ w: v.weight, e: hisEquity(s, v) })).sort((a, b) => a.e - b.e);
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
 * The strategy along the range, lowest equity to highest: one column per hand, all the same width.
 * Split, it opens into a row for each made hand, strongest first, each in its own place on the
 * same scale.
 */
function renderStrip(strata) {
  const s = state.survey; const el = $('strip');
  if (!s) { el.innerHTML = ''; return; }
  const hands = handsInOrder(s);
  const column = (row) => {
    const parts = [0, 0, 0, 0, 0]; row.hand.strategy.forEach((p, a) => { parts[strata[a]] += p; });
    // one painted box a column, the actions as bands of its background from the bottom up: a band too thin for a
    // pixel then stays inside the column, where a box of its own was drawn as a loose pixel under it
    const total = parts.reduce((t, x) => t + x, 0) || 1; let at = 0;
    const bands = parts.map((x, k) => { if (!(x > 0)) return ''; const from = at; at += (100 * x) / total; return `var(${COLORS[k]}) ${from.toFixed(2)}% ${at.toFixed(2)}%`; }).filter(Boolean);
    return `<button type="button" data-hand="${row.hand.name}" aria-pressed="${row.hand.name === state.hand}" aria-label="${esc(row.hand.name)}"><b style="height:100%;background:linear-gradient(to top,${bands.join(',')})"></b></button>`;
  };
  const names = state.decision.categories;
  if (state.chart === 'ladder') { el.className = 'rows ladder'; el.innerHTML = ladder(s, column); return; }
  if (state.chart !== 'split' || !names) { el.className = 'strip'; el.innerHTML = hands.map(column).join(''); return; }
  // Every row keeps the whole range's scale: a made hand sits where it sits in the single bar, with gaps either side
  const span = new Map();
  // a made hand's hands need not sit side by side in equity order: its share of the range is counted, not read off its span
  const held = new Map();
  hands.forEach((row, k) => { const c = row.hand.category; if (!span.has(c)) span.set(c, [k, k]); span.get(c)[1] = k + 1; held.set(c, (held.get(c) ?? 0) + 1); });
  el.className = 'rows';
  el.innerHTML = [...span.entries()].sort((a, b) => b[0] - a[0]).map(([c, [from, to]]) => {
    const name = names[c] ?? ''; const nice = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    const n = hands.length;
    const place = (from + to) / 2 < n / 2 ? `left:calc(${(100 * to / n).toFixed(2)}% + 8px)` : `right:calc(${(100 * (1 - from / n)).toFixed(2)}% + 8px)`;
    return `<div class="row"><div class="strip">${hands.map((row) => (row.hand.category === c ? column(row) : '<span></span>')).join('')}</div><span class="name" style="${place}"><span class="long">${esc(nice)}</span><span class="short">${esc(SHORT[nice] ?? nice)}</span> ${pct(held.get(c) / n)}</span></div>`;
  }).join('');
}
/**
 * The ladder: every hand of both ranges on one scale, lowest equity to highest, out of position's on the
 * top row and in position's below. A hand takes a column, and the other row is empty there, so the
 * two rows read as one chart cut in two: where each range sits, where they overlap, which one
 * reaches further at either end. Hands with the same equity share their columns, one above the
 * other. Only the player to act has a strategy to show; the other range is drawn plain.
 */
function ladder(s, column) {
  const d = state.decision;
  // one scale for both, on every street: each hand's equity against the other range, to a tenth of a percent
  const key = (equity) => Math.round(1e3 * equity);
  const levels = new Map();
  const at = (k) => { let level = levels.get(k); if (!level) levels.set(k, level = { mine: [], his: [] }); return level; };
  for (const row of s.rows) at(key(row.equity)).mine.push(row);
  for (const v of d.villain) at(key(hisEquity(s, v))).his.push(v);
  const top = []; const bottom = [];
  for (const k of [...levels.keys()].sort((a, b) => a - b)) {
    const level = levels.get(k);
    level.mine.sort((a, b) => (a.hand.name < b.hand.name ? -1 : 1));
    for (let i = 0; i < Math.max(level.mine.length, level.his.length); i++) {
      const acting = level.mine[i] ? column(level.mine[i]) : '<span></span>';
      const waiting = level.his[i] ? `<span class="other" title="${esc(level.his[i].name)}"></span>` : '<span></span>';
      (d.seat === 'oop' ? top : bottom).push(acting); (d.seat === 'oop' ? bottom : top).push(waiting);
    }
  }
  // no names on the rows: out of position is the top one, in position the bottom one
  const bars = (cells, seat) => `<div class="row"><div class="strip" role="group" aria-label="${seat}">${cells.join('')}</div></div>`;
  return bars(top, 'Out of position') + bars(bottom, 'In position');
}
/** The hands of the range to act, by equity against the other range, lowest first: the order of the strategy chart and of the equity curve above it. */
const handsInOrder = (s) => [...s.rows].sort((a, b) => a.equity - b.equity || (a.hand.strength ?? 0) - (b.hand.strength ?? 0) || (a.hand.name < b.hand.name ? -1 : 1));
/** A hand of the other player's, and its equity against the range to act: given before the river; on it, counted against that range with the cards the hand removes. */
function hisEquity(s, v) {
  if (v.equity !== undefined) return Number.isNaN(v.equity) ? 0 : v.equity;
  let mass = 0, win = 0;
  for (const r of s.rows) { const h = r.hand; if (v.cards && h.cards && (v.cards[0] === h.cards[0] || v.cards[0] === h.cards[1] || v.cards[1] === h.cards[0] || v.cards[1] === h.cards[1])) continue; mass += h.weight; win += h.weight * (v.strength > h.strength ? 1 : v.strength < h.strength ? 0 : 0.5); }
  return mass > 0 ? win / mass : 0;
}
function renderWhy() {
  const s = state.survey; const row = s?.byName.get(state.hand);
  // before the river there is the hand and what it does; the reasons are a river matter for now
  let told = !s || !state.hand || !row ? null : { name: row.hand.name, strategy: row.hand.strategy, equity: row.equity, line: '', reasons: [] };
  // the reasons come from the worker on every street: only what has been proven is said (research/proof/PROOF.md)
  if (told && row) {
    // the reasons come from the worker: asked for once a hand, shown when they arrive
    const key = `${state.node}|${state.dealt.join(' ')}|${row.hand.id}`; const got = state.told.get(key);
    if (got) told = { ...told, line: got.line, reasons: got.silent ? [...got.reasons, { text: got.silent, quiet: true }] : got.reasons };
    else { told = { ...told, reasons: [{ text: 'Working out the reasons\u2026', quiet: true }] }; if (!state.asked.has(key) && !state.scrub) { state.asked.add(key); worker.postMessage({ type: 'explain', job: state.job, id: state.node, dealt: state.dealt, combo: row.hand.id }); } }
  }
  if (!told) { rangeWhy(); return; }
  const d = state.decision; const strata = strataOf(d.actions);
  const title = d.abstract ? `${pct(told.equity)}%` : cardsHtml(told.name);
  const reasons = [...told.reasons];
  // the spot sentence is about the ranges as they start, so it stays with the street they start on
  if (state.spot?.text && !d.abstract && !(state.nodes?.[state.node]?.round > 0)) reasons.push({ text: state.spot.text });
  $('why').innerHTML = `<h2>${title}</h2>`
    + `<div class="mix"><span class="bar">${bar(told.strategy, strata)}</span><div class="nums">${d.actions.map((a, k) => (told.strategy[k] > 0.004 ? `<span><i class="sw" style="background:var(${COLORS[strata[k]]})"></i>${esc(a.label)} ${pct(told.strategy[k])}</span>` : '')).join('')}</div></div>`
    + `<div class="seg tabs" role="tablist"><button type="button" role="tab" data-tab="why" aria-selected="${state.tab === 'why'}" aria-pressed="${state.tab === 'why'}">Why</button><button type="button" role="tab" data-tab="look" aria-selected="${state.tab === 'look'}" aria-pressed="${state.tab === 'look'}">Analysis</button></div>`
    + (state.tab === 'look' ? lookHtml(row, strata) : (told.line ? `<p class="lead">${esc(told.line)}</p>` : '') + reasons.map((r) => `<p${r.quiet ? ' class="quiet"' : ''}>${esc(r.text)}</p>`).join(''));
}
/** No hand picked: the range to act, what it does, and the two ranges set side by side. */
function rangeWhy() {
  const s = state.survey; const d = state.decision;
  if (!s || !d) { $('why').innerHTML = ''; return; }
  const strata = strataOf(d.actions); const p = state.spot;
  const first = !(state.nodes?.[state.node]?.round > 0) && state.nodes?.[state.node]?.parent < 0;
  let body = '';
  if (state.tab === 'look') body = lookHtml(null, strata);
  else if (p?.facts) {
    body = (p.sentences ?? []).map((t, i) => `<p${i ? '' : ' class="lead"'}>${esc(t)}</p>`).join('')
      + `<table class="facts"><thead><tr><th></th><th>OOP</th><th>IP</th></tr></thead><tbody>${p.facts.map(([k, a, b]) => `<tr><th>${esc(k)}</th><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}</tbody></table>`
      + (first ? '' : '<p class="quiet">The two ranges as the spot starts.</p>');
  }
  $('why').innerHTML = `<h2>${d.seat === 'oop' ? 'OOP' : 'IP'} range</h2>`
    + `<div class="mix"><span class="bar">${bar(s.mix, strata)}</span><div class="nums">${d.actions.map((a, k) => (s.mix[k] > 0.004 ? `<span><i class="sw" style="background:var(${COLORS[strata[k]]})"></i>${esc(a.label)} ${pct(s.mix[k])}</span>` : '')).join('')}</div></div>`
    + `<div class="seg tabs" role="tablist"><button type="button" role="tab" data-tab="why" aria-pressed="${state.tab === 'why'}">Range</button><button type="button" role="tab" data-tab="look" aria-pressed="${state.tab === 'look'}">Analysis</button></div>`
    + body;
}
/** The analytical look: how equity is spread over the next card, and the hand names in the range with what each does. With a hand picked, only the names it carries. */
function lookHtml(row, strata) {
  const combo = row ? row.hand.id : null;
  const key = `${state.node}|${state.dealt.join(' ')}|${combo}`; const look = state.looked.get(key);
  if (!look) {
    if (!state.asked.has(`look|${key}`)) { state.asked.add(`look|${key}`); worker.postMessage({ type: 'analysis', job: state.job, id: state.node, dealt: state.dealt, combo }); }
    return '<p class="quiet">Working it out\u2026</p>';
  }
  let html = '';
  if (look.spread && (look.spread.hand.length || look.spread.range.length)) {
    // each card that can come, weakest for this hand first, against the equity the hand has then; the range the same way, faded
    const R = look.spread.range; const H = look.spread.hand.length ? look.spread.hand : R; const alone = !look.spread.hand.length; const SW = 560, SH = 220, P = 10;
    const Y = (e) => SH - P - e * (SH - 2 * P);
    const steps = (list, get) => list.map((v, i) => `${((i / list.length) * SW).toFixed(1)},${Y(get(v)).toFixed(1)} ${(((i + 1) / list.length) * SW).toFixed(1)},${Y(get(v)).toFixed(1)}`).join(' ');
    html += `<div class="spread"><svg viewBox="0 0 ${SW} ${SH}" role="img" aria-label="Equity on each ${look.spread.street} card">`
      + [0.25, 0.5, 0.75].map((v) => `<line class="gridl" x1="0" x2="${SW}" y1="${Y(v)}" y2="${Y(v)}"/>`).join('')
      + `<line class="axis" x1="0" x2="${SW}" y1="${Y(0)}" y2="${Y(0)}"/><line class="now" x1="0" x2="${SW}" y1="${Y(look.spread.now)}" y2="${Y(look.spread.now)}"/>`
      + `${alone ? '' : `<polyline class="wait" points="${steps(R, (v) => v.eq)}"/>`}<polyline class="act" points="${steps(H, (v) => v.eq)}"/></svg>`
      + `<div class="cap"><span>Equity ${pct(look.spread.now)}%</span>${look.spread.equityNow != null ? `<span>Equity now ${pct(look.spread.equityNow)}%</span>` : ''}${look.spread.drawEquity != null ? `<span>Draw equity ${pct(look.spread.drawEquity)}%</span>` : ''}</div></div>`;
  }
  // a hand picked: the names it carries; none: every name in the range
  html += `<ul class="types${row ? '' : ' all'}">${look.types.filter((t) => !row || t.has).map((t) => `<li class="${t.has ? 'has' : ''}" data-tag="${esc(t.name)}" role="button" tabindex="0">${row ? '<span class="mark">\u2713</span>' : '<span class="mark"></span>'}<span class="tname">${esc(t.name)}</span><span class="share">${pct(t.share)}%</span><span class="bar">${bar(t.mix, strata)}</span></li>`).join('')}</ul>`;
  return html;
}
$('why').addEventListener('click', (ev) => {
  const tag = ev.target.closest('[data-tag]'); if (tag) { openGroup(tag.dataset.tag); return; }
  const b = ev.target.closest('[data-tab]'); if (!b) return; state.tab = b.dataset.tab; renderWhy();
});
$('why').addEventListener('keydown', (ev) => { const tag = ev.target.closest?.('[data-tag]'); if (tag && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); openGroup(tag.dataset.tag); } });
// ---- every hand that carries a name: a drawer, strongest first, each with what it does ----
function openGroup(name) {
  const s = state.survey; if (!s) return;
  const look = state.looked.get(`${state.node}|${state.dealt.join(' ')}|${s.byName.get(state.hand)?.hand.id ?? null}`); const type = look?.types.find((t) => t.name === name); if (!type) return;
  const ids = new Set(type.ids); const strata = strataOf(state.decision.actions);
  const rows = s.rows.filter((r) => ids.has(r.hand.id)).sort((x, y) => y.equity - x.equity || (x.hand.name < y.hand.name ? -1 : 1));
  $('group').innerHTML = `<div class="g-head"><h3>${esc(name)}</h3><span>${rows.length} hands \u00b7 ${pct(type.share)}% of the range</span></div>`
    + `<div class="mix"><span class="bar">${bar(type.mix, strata)}</span></div>`
    + `<div class="g-list">${rows.map((r) => `<button type="button" data-hand="${r.hand.name}" aria-pressed="${state.hand === r.hand.name}"><span>${cardsHtml(r.hand.name)}</span><span class="bar">${bar(r.hand.strategy, strata)}</span>${spark(look.curves?.[r.hand.id], r.equity)}</button>`).join('')}</div>`;
  $('group').hidden = false; $('scrim').hidden = false; $('group').focus({ preventScroll: true });
}
/** A hand's equity on each card that can come next, weakest first, drawn small: the dotted line is its equity now. */
function spark(list, now) {
  if (!list?.length) return '';
  const SW = 60, SH = 24; const Y = (e) => SH - 1 - e * (SH - 2);
  const pts = list.map((e, i) => `${((i / list.length) * SW).toFixed(1)},${Y(e).toFixed(1)} ${(((i + 1) / list.length) * SW).toFixed(1)},${Y(e).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${SW} ${SH}" preserveAspectRatio="none" aria-hidden="true"><line class="mid" x1="0" x2="${SW}" y1="${Y(0.5)}" y2="${Y(0.5)}"/><line class="now" x1="0" x2="${SW}" y1="${Y(now)}" y2="${Y(now)}"/><polyline points="${pts}"/></svg>`;
}
function closeGroup() { if ($('group').hidden) return; $('group').hidden = true; $('scrim').hidden = true; }
$('group').addEventListener('click', (ev) => { const b = ev.target.closest('[data-hand]'); if (!b) return; state.hand = b.dataset.hand; state.cell = cellOf(state.hand); closeGroup(); render(); });
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') closeGroup(); });

const W = 560, PAD = 8;
$('line').addEventListener('click', (ev) => {
  if (ev.target.closest('#villain')) { showVillain(ev.target.closest('#villain')); return; }
  const deal = ev.target.closest('[data-deal]'); if (deal) { state.pick = +deal.dataset.deal; render(); return; }
  if (ev.target.closest('#split')) { state.chart = CHARTS[(CHARTS.indexOf(state.chart) + 1) % CHARTS.length]; remember(); render(); $('split')?.focus(); return; }
  if (ev.target.closest('#view')) { state.view = state.view === 'grid' ? 'curve' : 'grid'; remember(); render(); $('view')?.focus(); return; }
  const b = ev.target.closest('[data-go]'); if (b) go(+b.dataset.go);
});
// ---- the action chart under a thumb: slide along it and the hand under the thumb is the one picked ----
const scrub = { on: false, moved: false, x: 0, frame: 0 };
/** The hand whose column is at a place across the chart. With several rows, the row nearest up and down that has a hand there. */
function handAt(x, y) {
  const el = $('strip'); const inner = el.querySelectorAll('.strip'); const rows = inner.length ? [...inner] : [el];
  let best = null; let gap = Infinity;
  for (const row of rows) {
    const r = row.getBoundingClientRect(); const mid = r.top + r.height / 2;
    const b = document.elementFromPoint(Math.min(r.right - 1, Math.max(r.left, x)), mid)?.closest?.('#strip [data-hand]');
    if (b && Math.abs(y - mid) < gap) { gap = Math.abs(y - mid); best = b.dataset.hand; }
  }
  return best;
}
const pickHand = (name) => {
  // the hand already picked, picked again: back to the range
  if (state.hand === name) { state.hand = null; state.cell = null; } else { state.hand = name; state.cell = cellOf(name); }
  render();
};
$('strip').addEventListener('pointerdown', (ev) => {
  if (ev.button > 0 || !state.survey) return;
  Object.assign(scrub, { on: true, moved: false, x: ev.clientX });
  // the chart is drawn again as hands are passed over: the touch stays with the chart itself, not with a column that is gone
  try { $('strip').setPointerCapture(ev.pointerId); } catch { /* a pointer that cannot be held */ }
});
$('strip').addEventListener('pointermove', (ev) => {
  if (!scrub.on) return;
  if (Math.abs(ev.clientX - scrub.x) > 4) scrub.moved = true;
  if (!scrub.moved) return;
  const name = handAt(ev.clientX, ev.clientY); if (!name || name === state.hand) return;
  state.hand = name; state.cell = cellOf(name); state.scrub = true;
  // once a frame at most; the reasons are asked for when the thumb lifts, not for every hand it passes
  if (!scrub.frame) scrub.frame = requestAnimationFrame(() => { scrub.frame = 0; render(); });
});
const scrubEnd = (ev) => {
  if (!scrub.on) return; scrub.on = false;
  if (state.scrub) { state.scrub = false; render(); return; }
  // a tap: the column under it, as before
  if (ev.type === 'pointerup' && !scrub.moved) { const b = document.elementFromPoint(ev.clientX, ev.clientY)?.closest?.('#strip [data-hand]'); if (b) pickHand(b.dataset.hand); }
};
$('strip').addEventListener('pointerup', scrubEnd); $('strip').addEventListener('pointercancel', scrubEnd);
// the keyboard still picks a column with Enter or the space bar: a click that no pointer made
$('strip').addEventListener('click', (ev) => {
  if (ev.detail !== 0) return;
  const b = ev.target.closest('[data-hand]'); if (!b) return;
  // the hand already picked, picked again: back to the range
  if (state.hand === b.dataset.hand) { state.hand = null; state.cell = null; render(); return; }
  state.hand = b.dataset.hand; state.cell = cellOf(state.hand); render();
});
$('range').addEventListener('click', (ev) => {
  const cell = ev.target.closest('[data-cell]'); const hand = ev.target.closest('[data-hand]');
  if (cell && state.cell === cell.dataset.cell) { state.hand = null; state.cell = null; render(); return; }
  if (cell) { state.cell = cell.dataset.cell; const rows = state.survey.rows.filter((r) => cellOf(r.hand.name) === state.cell).sort((a, b) => b.hand.weight - a.hand.weight); state.hand = rows[0]?.hand.name ?? null; render(); }
  if (hand) { state.hand = hand.dataset.hand; render(); }
});
$('combos').addEventListener('click', (ev) => { const b = ev.target.closest('[data-hand]'); if (!b) return; if (state.hand === b.dataset.hand) { state.hand = null; state.cell = null; } else { state.hand = b.dataset.hand; state.cell = cellOf(state.hand); } render(); });
// ---- setup: the ranges are painted on a chart or typed, whichever is at hand ----
const draft = { side: 'oop', oop: '', ip: '' };
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
  $('f-range').value = draft[draft.side]; renderPaint(); checkFit();
};
window.addEventListener('pointerup', endStroke); window.addEventListener('pointercancel', endStroke);
$('f-range').addEventListener('input', () => { draft[draft.side] = $('f-range').value; renderPaint(); });
$('p-oop').onclick = () => showSide('oop'); $('p-ip').onclick = () => showSide('ip');
$('p-clear').onclick = () => { draft[draft.side] = ''; showSide(draft.side); checkFit(); };
function openSetup(how) {
  // from a street's first decision: only the betting is asked, the board and the ranges are what arrived there
  const sub = !!how?.sub; $('drawer').classList.toggle('sub', sub); $('drawer').dataset.sub = sub ? '1' : '';
  const c = sub ? conf() : state.config;
  $('f-board').value = c.board; $('f-pot').value = c.pot; $('f-stack').value = c.stack;
  $('f-bets').value = (Array.isArray(c.bets[0]) ? c.bets : [c.bets]).map((list) => list.map((b) => Math.round(100 * b)).join(' ')).join(' / '); $('f-raise').value = c.raises.join(' '); $('f-max').value = c.maxRaises; $('f-allin').checked = !!c.allIn;
  draft.oop = c.oop; draft.ip = c.ip; showSide(draft.side);
  $('drawer').hidden = false; $('scrim').hidden = false;
  showFit(false); checkFit();
  // Focus the drawer itself, never a field: on a phone a focused field brings up the keyboard and zooms the page
  $('drawer').focus({ preventScroll: true });
}
const closeSetup = () => { $('drawer').hidden = true; $('scrim').hidden = true; $('f-error').textContent = ''; };
// copy and the pen sit in the header, beside setup
$('copy').onclick = () => { if (state.decision) copyText(spotText()).then((ok) => copied($('copy'), ok)); };
$('edit').onclick = () => { if (state.decision && !version().fixed) openEditor(); };
$('open-setup').onclick = () => openSetup(); $('f-sub').onclick = () => openSetup({ sub: true }); $('scrim').onclick = () => { closeSetup(); closeEditor(); closeGroup(); };
$('state').onclick = () => { if ($('state').dataset.busy) worker.postMessage({ type: 'stop' }); };
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && !$('drawer').hidden) closeSetup(); });
/** What the setup form holds: the betting, the board as typed, or what is missing. */
function readForm() {
  // one list of sizes for every street, or one list a street, apart by a slash
  const lists = $('f-bets').value.split('/').map((part) => part.split(/[\s,]+/).map(Number).filter((x) => x > 0).map((x) => x / 100)).filter((list) => list.length);
  const bets = lists.length > 1 ? lists : lists[0] ?? [];
  const pot = Number($('f-pot').value); const stack = Number($('f-stack').value);
  const raises = $('f-raise').value.split(/[\s,x]+/i).map(Number).filter((x) => x > 1);
  const maxRaises = Math.max(0, Math.min(4, Math.round(Number($('f-max').value) || 0)));
  const board = ($('f-board').value.match(/[2-9TJQKAtjqka][shdcSHDC]/g) ?? []).map((c) => c[0].toUpperCase() + c[1].toLowerCase());
  if (!(pot > 0) || !(stack >= 0) || !bets.length) return { error: 'Pot, stack and at least one bet size are needed.' };
  return { pot, stack, board, betting: { bets, raises: maxRaises > 0 ? raises : [], maxRaises: raises.length ? maxRaises : 0, allIn: $('f-allin').checked } };
}
// ---- a spot too big to solve whole can still be solved lite: the button says so, in red ----
const fit = { id: 0, timer: null, lite: false };
function showFit(lite, note = '') { fit.lite = lite; $('f-solve').textContent = lite ? 'Solve (Lite)' : 'Solve'; $('f-solve').classList.toggle('lite', lite); $('f-fit').textContent = note; }
/** Ask, a moment after the form last changed, whether the spot in it can be solved whole. */
function checkFit() {
  clearTimeout(fit.timer);
  fit.timer = setTimeout(() => {
    const form = readForm(); const id = ++fit.id;
    if ($('drawer').hidden || $('drawer').dataset.sub || form.error || form.board.length < 3 || form.board.length > 5 || new Set(form.board).size !== form.board.length || !cellsOf(draft.oop)?.size || !cellsOf(draft.ip)?.size) { showFit(false); return; }
    worker.postMessage({ type: 'fits', id, config: { ...form.betting, pot: form.pot, stack: form.stack, board: form.board.join(' '), oop: draft.oop.trim(), ip: draft.ip.trim() } });
  }, 250);
}
function onFits(data) {
  if (data.id !== fit.id) return;
  const later = ($('f-board').value.match(/[2-9TJQKAtjqka][shdcSHDC]/g) ?? []).length === 3 ? 'the turn and river' : 'the river';
  showFit(!data.whole && data.lite, data.whole ? '' : data.lite ? `${data.message} Lite solves it with your betting on this street and one bet size on ${later}.` : data.message);
}
$('drawer').addEventListener('input', checkFit);
$('drawer').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const form = readForm();
  if (form.error) { $('f-error').textContent = form.error; return; }
  const { pot, stack, board, betting } = form;
  if ($('drawer').dataset.sub) { state.sub = betting; closeSetup(); state.status = 'solving'; $('state').textContent = state.status; worker.postMessage({ type: 'subgame', job: state.job, id: state.node, dealt: state.dealt }); return; }
  if (board.length < 3 || board.length > 5 || new Set(board).size !== board.length) { $('f-error').textContent = 'Three, four or five board cards are needed.'; return; }
  if ((!cellsOf(draft.oop)?.size || !cellsOf(draft.ip)?.size)) { $('f-error').textContent = 'Both ranges need hands.'; return; }
  Object.assign(state.config, { pot, stack, ...betting, board: board.join(' '), oop: draft.oop.trim(), ip: draft.ip.trim(), lite: fit.lite });
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
