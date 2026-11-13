// Train: questions on boards dealt at random. The ranges, pot and bet sizes are the ones set up in Study.
import { explain, survey } from '../src/explain/river.js';
import { outline } from '../src/explain/outline.js';
import { $, COLORS, DEFAULTS, cardsHtml, cellName, cellOf, esc, pct, strataOf } from './common.js';

const TYPES = { range: 'Range advantage', nuts: 'Nut advantage', size: 'Maximum bet or raise', hand: 'What a hand can do' };
const STREETS = { flop: 'Flop', turn: 'Turn', river: 'River' };
/** A nut hand has this much equity against the other range, as in Study's editor. */
const NUTS = 0.9;
const AGGRESSIVE = new Set(['bet', 'raise', 'allin']);
/** How often a hand has to take an action for it to count as one it takes; under LOW it does not. Hands in between are not asked about. */
const TAKES = 0.16; const LOW = 0.04;
/** A made-hand type as a group of hands. */
const GROUP = { 'high card': 'unpaired hands', pair: 'one-pair hands', 'two pair': 'two pair', 'three of a kind': 'three of a kind', straight: 'straights', flush: 'flushes', 'full house': 'full houses', 'four of a kind': 'quads', 'straight flush': 'straight flushes' };
const STROKE = 'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';
const TICK = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M3.5 8.5l3 3 6-7" ${STROKE}/></svg>`;
const CROSS = `<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" ${STROKE}/></svg>`;

// ---- what is kept between visits: the choices, each day's results, the last questions ----
const KEY = 'pareto-train';
const store = { types: { range: true, nuts: true, size: true, hand: true }, streets: { flop: false, turn: false, river: true }, view: 'grid', days: {}, log: [] };
try {
  const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null');
  if (saved) {
    for (const k of Object.keys(TYPES)) if (typeof saved.types?.[k] === 'boolean') store.types[k] = saved.types[k];
    for (const k of Object.keys(STREETS)) if (typeof saved.streets?.[k] === 'boolean') store.streets[k] = saved.streets[k];
    if (saved.view === 'curve') store.view = 'curve';
    if (saved.days && typeof saved.days === 'object') store.days = saved.days;
    if (Array.isArray(saved.log)) store.log = saved.log;
  }
} catch { /* first visit */ }
if (!Object.values(store.types).some(Boolean)) store.types.range = true;
if (!Object.values(store.streets).some(Boolean)) store.streets.river = true;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* private window */ } };
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => store.days[dayKey()] ?? { ok: 0, n: 0, by: {} };
/** One answer goes into its day, under its question type and its street. */
function record(entry) {
  const day = store.days[entry.day] ??= { ok: 0, n: 0, by: {} };
  day.n++; if (entry.ok) day.ok++;
  for (const k of [entry.type, entry.street]) { const at = day.by[k] ??= [0, 0]; at[1]++; if (entry.ok) at[0]++; }
  const keys = Object.keys(store.days).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - 90))) delete store.days[k];
  store.log.unshift(entry); store.log.length = Math.min(store.log.length, 30);
  save();
}
/** The last five days a question type or a street was played, newest first. */
const lastDays = (key) => Object.keys(store.days).sort().reverse().filter((d) => store.days[d].by?.[key]?.[1] > 0).slice(0, 5).map((d) => ({ day: d, ok: store.days[d].by[key][0], n: store.days[d].by[key][1] }));
const dayName = (key) => { const [y, m, d] = key.split('-').map(Number); return key === dayKey() ? 'Today' : new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }); };

// ---- the spot: Study's setup, on a board dealt here ----
const config = { ...DEFAULTS };
try { const saved = JSON.parse(localStorage.getItem('pareto') ?? 'null'); if (saved?.config) Object.assign(config, saved.config); } catch { /* first visit */ }
if (!Array.isArray(config.raises)) config.raises = [];
// What is being asked about, and what waits: `board` is the board on screen with its positions, `boards` the ones solved ahead of it
const game = { boards: [], board: null, spot: null, q: null, busy: null, progress: null, id: 0, failed: 0, error: '' };
/** How many boards to keep solved ahead of the one on screen. */
const AHEAD = 3;
const worker = new Worker(new URL('./train-worker.js', import.meta.url));
/** Solve in the background until enough boards wait. The worker deals the board. */
function want() {
  if (game.busy || game.boards.length >= AHEAD || game.failed >= 3) return;
  const streets = Object.keys(STREETS).filter((s) => store.streets[s]);
  const street = streets[Math.floor(Math.random() * streets.length)];
  game.busy = { id: ++game.id, street }; game.progress = null;
  worker.postMessage({ type: 'deal', id: game.id, street, config });
}
worker.onmessage = ({ data }) => {
  if (!game.busy || data.id !== game.busy.id) return;
  if (data.type === 'progress') { game.progress = data; if (!game.q) renderAsk(); return; }
  game.busy = null;
  if (data.type === 'error') { game.failed++; game.error = data.message; }
  if (data.type === 'dealt') { game.failed = 0; game.error = ''; if (data.decisions.length) {
      // a flop may be a card away from the one solved before it: it goes in anywhere in the queue, so the two do not always follow each other
      const board = { street: data.street, spots: data.decisions.map(spotOf), at: 0, round: 0, got: 0 };
      game.boards.splice(data.near ? Math.floor(Math.random() * (game.boards.length + 1)) : game.boards.length, 0, board);
    }
  }
  if (!game.q) advance(); else want();
};

/** A decision as the questions need it: each range's hands with their equity, and what the two ranges add up to. */
function spotOf(decision) {
  const s = decision.street === 'river' ? survey(decision) : outline(decision);
  const hero = s.rows.map((r) => ({ w: r.hand.weight, e: r.equity, name: r.hand.name })).sort((a, b) => a.e - b.e || (a.name < b.name ? -1 : 1));
  // his hands against the range to act, with the cards each removes
  const villain = decision.villain.map((v) => {
    if (v.equity !== undefined) return { w: v.weight, e: Number.isNaN(v.equity) ? 0 : v.equity, name: v.name };
    let mass = 0, win = 0;
    for (const r of s.rows) { const h = r.hand; if (v.cards[0] === h.cards[0] || v.cards[0] === h.cards[1] || v.cards[1] === h.cards[0] || v.cards[1] === h.cards[1]) continue; mass += h.weight; win += h.weight * (v.strength > h.strength ? 1 : v.strength < h.strength ? 0 : 0.5); }
    return { w: v.weight, e: mass > 0 ? win / mass : 0, name: v.name };
  }).sort((a, b) => a.e - b.e);
  const sum = (list) => { let total = 0, equity = 0, nuts = 0; for (const h of list) { total += h.w; equity += h.w * h.e; if (h.e >= NUTS) nuts += h.w; } return { combos: total, equity: equity / total, nuts: nuts / total }; };
  return { decision, s, hero, villain, mine: sum(hero), his: sum(villain), asked: {}, seen: new Set() };
}

// ---- the questions ----
const share = (x) => (x > 0 && x < 0.095 ? (100 * x).toFixed(1) : pct(x));
const sides = [{ label: 'Hero' }, { label: 'Villain' }, { label: 'Neither' }];
/** Hero, villain or neither, by a difference: too small is neither, and one that could be read either way is not asked. */
const whose = (diff, small, clear) => (Math.abs(diff) < small ? 2 : Math.abs(diff) >= clear ? (diff > 0 ? 0 : 1) : null);
const BUILD = {
  range(spot) {
    const right = whose(spot.mine.equity - spot.his.equity, 0.02, 0.04);
    if (right == null) return null;
    return { text: 'Who has the range advantage?', options: sides, right: [right], why: [`Hero's range has ${pct(spot.mine.equity)}% equity, villain's ${pct(spot.his.equity)}%.${right === 2 ? ' Under two points apart is neither\'s.' : ''}`] };
  },
  nuts(spot) {
    const right = whose(spot.mine.nuts - spot.his.nuts, 0.01, 0.025);
    if (right == null) return null;
    return { text: 'Who has the nut advantage?', options: sides, right: [right], why: [`Hands with ${pct(NUTS)}% equity or more are ${share(spot.mine.nuts)}% of hero's range and ${share(spot.his.nuts)}% of villain's.${right === 2 ? ' Under one point apart is neither\'s.' : ''}`] };
  },
  size(spot) {
    const { decision: d, s } = spot;
    const sized = d.actions.map((a, k) => k).filter((k) => AGGRESSIVE.has(d.actions[k].kind)).sort((a, b) => d.actions[a].add - d.actions[b].add);
    if (!sized.length) return null;
    const used = sized.filter((k) => s.mix[k] >= LOW);
    const top = used.length ? used[used.length - 1] : -1;
    // a bigger size the range takes now and then: neither used nor unused
    if (sized.some((k) => s.mix[k] > 0.015 && s.mix[k] < LOW && (top < 0 || d.actions[k].add > d.actions[top].add))) return null;
    const verb = s.facing ? 'raise' : 'bet';
    const why = [`Across your range: ${d.actions.map((a, k) => (s.mix[k] > 0.004 ? `${a.label} ${pct(s.mix[k])}%` : '')).filter(Boolean).join(', ')}.`];
    if (top >= 0 && d.street === 'river') {
      // what the biggest size is made of
      const by = new Map(); let all = 0;
      for (const r of s.rows) { const w = r.hand.weight * r.hand.strategy[top]; if (w > 0) { all += w; by.set(r.hand.category, (by.get(r.hand.category) ?? 0) + w); } }
      const groups = [...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).filter(([, w]) => w / all >= 0.15).map(([c, w]) => { const name = String(d.categories[c]).toLowerCase(); return `${GROUP[name] ?? name} (${pct(w / all)}%)`; });
      why.push(`${d.actions[top].label} is taken ${groups.length ? `mostly by ${groups.join(' and ')}` : 'by many kinds of hand'}; ${pct(s.sizes[top].bluffShare)}% of it is bluffs, where the size allows about ${pct(s.sizes[top].wanted)}%.`);
    }
    why.push(`Nut hands are ${share(spot.mine.nuts)}% of your range and ${share(spot.his.nuts)}% of his.`);
    return { text: `What's your maximum ${verb} size?`, options: [{ label: `No ${verb}` }, ...sized.map((k) => ({ label: d.actions[k].label, action: k }))], right: [top < 0 ? 0 : 1 + sized.indexOf(top)], why };
  },
  hand(spot) {
    const { decision: d, s } = spot;
    if (d.actions.length < 2) return null;
    const clear = s.rows.filter((r) => r.hand.weight >= 0.25 && !spot.seen.has(r.hand.name) && r.hand.strategy.every((p) => p <= LOW || p >= TAKES));
    if (!clear.length) return null;
    // half the time a hand with a choice to make, when there is one
    const mixed = clear.filter((r) => r.hand.strategy.filter((p) => p >= TAKES).length > 1);
    const pool = mixed.length && Math.random() < 0.5 ? mixed : clear;
    let roll = Math.random() * pool.reduce((t, r) => t + r.hand.weight, 0);
    const row = pool.find((r) => (roll -= r.hand.weight) <= 0) ?? pool[pool.length - 1];
    spot.seen.add(row.hand.name);
    const why = [`It plays ${d.actions.map((a, k) => (row.hand.strategy[k] > 0.004 ? `${a.label} ${pct(row.hand.strategy[k])}%` : '')).filter(Boolean).join(', ')}.`];
    if (d.street === 'river') { const told = explain(s, row.hand.name); if (told) why.push(...[told.line, ...told.reasons.map((r) => r.text)].filter(Boolean)); }
    return { text: 'What actions can it take?', hand: row.hand.name, multi: true, options: d.actions.map((a, k) => ({ label: a.label, action: k })), right: d.actions.map((a, k) => k).filter((k) => row.hand.strategy[k] >= TAKES), why };
  },
};
/** How many times a hand is asked about on one position, each time round the board. Earlier streets cost more to solve, so more there. */
const HANDS = { river: 1, turn: 2, flop: 2 };
/** The next question on a position, or null when it has none left to ask this time round. */
function ask(spot, round) {
  const street = spot.decision.street;
  if (!store.streets[street]) return null;
  for (const type of Object.keys(TYPES)) {
    if (!store.types[type]) continue;
    const limit = type === 'hand' ? HANDS[street] * (round + 1) : 1;
    if ((spot.asked[type] ?? 0) >= limit) continue;
    spot.asked[type] = (spot.asked[type] ?? 0) + 1;
    const q = BUILD[type](spot);
    if (q) return { ...q, type, street, chosen: new Set(), done: false, ok: null };
  }
  return null;
}
/**
 * On to the next question: the rest of this position, then the board's other positions, then the
 * next board. With no board waiting, the board on screen is gone round again with other hands,
 * which buys the solve in the background its time.
 */
function advance() {
  game.q = null;
  while (!game.q) {
    const b = game.board;
    if (b) {
      // with a full queue behind it a board is left after two positions: the solver is idle until one is taken
      const most = game.boards.length >= AHEAD ? Math.min(2, b.spots.length) : b.spots.length;
      for (; b.at < most; b.at++) { game.spot = b.spots[b.at]; game.q = ask(game.spot, b.round); if (game.q) { b.got++; break; } }
      if (game.q) break;
      if (!game.boards.length && b.got > 0 && b.round < 4 && store.types.hand && store.streets[b.street]) { b.round++; b.at = 0; b.got = 0; continue; }
    }
    game.board = game.boards.shift() ?? null;
    if (!game.board) { game.spot = null; break; }
  }
  want(); render();
}
const namesOf = (q, set) => [...set].sort((a, b) => a - b).map((k) => q.options[k].label).join(', ') || 'Nothing';
function grade() {
  const q = game.q; if (!q || q.done || !q.chosen.size) return;
  q.done = true;
  q.ok = q.chosen.size === q.right.length && q.right.every((k) => q.chosen.has(k));
  const d = game.spot.decision;
  record({ t: Date.now(), day: dayKey(), type: q.type, street: q.street, ok: q.ok, board: d.boardText, seat: d.seat, line: d.line, hand: q.hand ?? null, text: q.text, mine: namesOf(q, q.chosen), right: namesOf(q, q.right), why: q.why, explained: q.street === 'river' });
  render();
  $('next')?.focus({ preventScroll: true });
}

// ---- drawing ----
function render() {
  renderScore();
  const spot = game.spot;
  $('board').innerHTML = spot ? cardsHtml(spot.decision.boardText) : '';
  for (const part of [renderWhere, renderRanges, renderAsk]) { try { part(); } catch (error) { console.error(error); } }
}
function renderScore() {
  const t = today();
  $('score').innerHTML = `<b>${t.ok}</b>/${t.n}`;
  $('rule').innerHTML = t.n ? `<i style="flex:${t.ok};background:var(--ok)"></i><i style="flex:${t.n - t.ok};background:var(--danger)"></i>` : '';
}
const seatName = (seat) => (seat === 'oop' ? 'OOP' : 'IP');
const curveIcon = `<path d="M2 13c3 0 3-4 6-5s3-5 6-5" ${STROKE}/>`;
const gridIcon = `<path d="M2.5 2.5h11v11h-11zM6.2 2.5v11M9.8 2.5v11M2.5 6.2h11M2.5 9.8h11" ${STROKE}/>`;
/** Where the hand stands: who hero is, the line so far, the pot and what is left behind. */
function renderWhere() {
  const spot = game.spot;
  if (!spot) { $('where').innerHTML = ''; return; }
  const d = spot.decision; const last = d.line[d.line.length - 1];
  const stands = !d.line.length ? 'First to act' : last === 'X' ? 'Checked to you' : `Facing ${last}`;
  const num = (x) => String(Math.round(10 * x) / 10);
  $('where').innerHTML = `<span class="who">Hero ${seatName(d.seat)}</span><span class="stands">${esc(stands)}</span><span class="grow"></span><span class="chips">Pot ${num(d.pot)}</span><span class="chips">Behind ${num(d.behind)}</span>`
    + `<button type="button" class="icon" id="view" aria-label="${store.view === 'grid' ? 'Equity distribution' : 'Ranges'}"><svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">${store.view === 'grid' ? curveIcon : gridIcon}</svg></button>`;
}
/** The two ranges side by side, hero in ink and villain faded; or, in their place, the two equity curves drawn the same way. */
function renderRanges() {
  const spot = game.spot; const grid = store.view === 'grid';
  $('minis').hidden = !grid; $('dist').hidden = grid;
  if (!spot) { $('minis').innerHTML = mini('Hero', null) + mini('Villain', null, 'villain'); $('dist').innerHTML = ''; return; }
  const d = spot.decision; const hand = game.q?.hand ?? null;
  if (grid) {
    $('minis').innerHTML = mini(`Hero ${seatName(d.seat)}`, spot.hero, '', hand ? cellOf(hand) : null) + mini(`Villain ${seatName(d.seat === 'oop' ? 'ip' : 'oop')}`, spot.villain, 'villain');
    return;
  }
  const W = 560, H = 350, PAD = 8;
  const Y = (y) => H - PAD - y * (H - 2 * PAD);
  const steps = (list) => { const total = list.reduce((t, r) => t + r.w, 0); let x = 0; const pts = []; for (const r of list) { const w = r.w / total; pts.push(`${(x * W).toFixed(1)},${Y(r.e).toFixed(1)} ${((x + w) * W).toFixed(1)},${Y(r.e).toFixed(1)}`); r.mid = x + w / 2; x += w; } return pts.join(' '); };
  const mine = steps(spot.hero); const his = steps(spot.villain);
  const pick = hand ? spot.hero.find((r) => r.name === hand) : null;
  $('dist').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Equity distribution: hero in ink, villain faded">`
    + [0.25, 0.5, 0.75].map((v) => `<line class="gridl" x1="0" x2="${W}" y1="${Y(v)}" y2="${Y(v)}"/>`).join('')
    + `<line class="axis" x1="0" x2="${W}" y1="${Y(0)}" y2="${Y(0)}"/><polyline class="wait" points="${his}"/><polyline class="act" points="${mine}"/>`
    + (pick ? `<circle class="dot" cx="${(pick.mid * W).toFixed(1)}" cy="${Y(pick.e).toFixed(1)}" r="5"/>` : '') + '</svg>';
}
function mini(title, hands, kind = '', marked = null) {
  const cells = new Map(); let combos = 0;
  for (const h of hands ?? []) { const key = cellOf(h.name); cells.set(key, (cells.get(key) ?? 0) + h.w); combos += h.w; }
  let html = '';
  for (let i = 0; i < 13; i++) for (let j = 0; j < 13; j++) {
    const key = `${i},${j}`; const held = Math.min(1, (cells.get(key) ?? 0) / (i === j ? 6 : i < j ? 4 : 12));
    html += `<b${key === marked ? ' class="mark"' : ''} style="grid-column:${j + 1 + (j > 4) + (j > 8)};grid-row:${i + 1 + (i > 4) + (i > 8)}" title="${cellName(i, j)}"><i style="height:${Math.round(100 * held)}%"></i></b>`;
  }
  return `<figure class="mini ${kind}"><figcaption><span>${esc(title)}</span><span>${hands ? Math.round(combos) : ''}</span></figcaption><div class="paint" role="img" aria-label="${esc(title)}'s range">${html}</div></figure>`;
}
function renderAsk() {
  const el = $('ask'); const q = game.q;
  if (!q) {
    if (game.failed >= 3) { el.innerHTML = `<p class="lead">This setup cannot be solved.</p><p>${esc(game.error)}</p><p>The ranges, pot and bet sizes are the ones set up in <a href="study.html">Study</a>.</p>`; return; }
    // nothing ready: say what is being solved and how far along
    const p = game.progress; const street = game.busy?.street ?? '';
    const near = Math.max(0.04, p?.done ?? 0);
    el.innerHTML = `<div class="kind">Next spot</div><p class="lead">Solving a ${esc(street)}</p><div class="track"><i style="width:${(100 * near).toFixed(1)}%"></i></div>${street === 'flop' ? '<p>A flop takes up to a minute, solved lite: its own bets and raises, one bet size on the turn and river.</p>' : ''}`;
    return;
  }
  const strata = strataOf(game.spot.decision.actions);
  const right = new Set(q.right);
  const option = (o, k) => {
    const state = !q.done ? '' : right.has(k) ? ' right' : q.chosen.has(k) ? ' wrong' : '';
    const sw = o.action != null ? `<i class="sw" style="background:var(${COLORS[strata[o.action]]})"></i>` : '';
    const mark = !q.done ? '' : right.has(k) ? TICK : q.chosen.has(k) ? CROSS : '';
    return `<button type="button" class="opt${state}" data-opt="${k}" aria-pressed="${q.chosen.has(k)}" ${q.done ? 'disabled' : ''}>${sw}<span>${esc(o.label)}</span>${mark}</button>`;
  };
  el.innerHTML = `<div class="kind">${esc(TYPES[q.type])}</div>`
    + (q.hand ? `<h2>${cardsHtml(q.hand)}</h2>` : '')
    + `<p class="text">${esc(q.text)}</p>`
    + `<div class="opts${q.done && !q.ok ? ' missed' : ''}" role="group" aria-label="Answers">${q.options.map(option).join('')}</div>`
    + (q.multi && !q.done ? `<p class="hint">Pick every one that applies.</p>` : '')
    + (q.done ? `<div class="verdict ${q.ok ? 'good' : 'bad'}" role="status">${q.ok ? TICK : CROSS}<span>${q.ok ? 'Correct' : 'Not this time'}</span></div><p class="fact">${esc(q.why[0])}</p>` : '')
    + (q.done ? '<button type="button" class="primary" id="next">Next</button>' : q.multi ? `<button type="button" class="primary" id="answer" ${q.chosen.size ? '' : 'disabled'}>Answer</button>` : '');
}
$('ask').addEventListener('click', (ev) => {
  if (ev.target.closest('#next')) { advance(); return; }
  if (ev.target.closest('#answer')) { grade(); return; }
  const b = ev.target.closest('[data-opt]'); const q = game.q; if (!b || !q || q.done) return;
  const k = +b.dataset.opt;
  if (!q.multi) { q.chosen = new Set([k]); grade(); return; }
  if (q.chosen.has(k)) q.chosen.delete(k); else q.chosen.add(k);
  renderAsk(); $('ask').querySelector(`[data-opt="${k}"]`)?.focus({ preventScroll: true });
});
$('where').addEventListener('click', (ev) => { if (!ev.target.closest('#view')) return; store.view = store.view === 'grid' ? 'curve' : 'grid'; save(); renderWhere(); renderRanges(); $('view')?.focus(); });
// the number keys answer, Enter moves on
document.addEventListener('keydown', (ev) => {
  if (!$('settings').hidden || !$('history').hidden || ev.metaKey || ev.ctrlKey || ev.altKey) return;
  const q = game.q; if (!q) return;
  if (ev.key === 'Enter' && document.activeElement?.tagName !== 'BUTTON') { if (q.done) advance(); else if (q.multi) grade(); return; }
  const k = Number(ev.key) - 1;
  if (Number.isInteger(k) && k >= 0 && k < q.options.length) $('ask').querySelector(`[data-opt="${k}"]`)?.click();
});

// ---- the drawers: settings, and the last questions ----
const shut = () => { $('settings').hidden = true; $('history').hidden = true; $('scrim').hidden = true; };
function open(id) { shut(); $(id).hidden = false; $('scrim').hidden = false; $(id).focus({ preventScroll: true }); }
$('scrim').onclick = shut;
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') shut(); });
const unfolded = new Set();
/** A choice in settings: a box that turns it on or off, and its name, which unfolds its last five days. */
function choice(group, key, name) {
  const on = store[group][key]; const open = unfolded.has(key);
  const days = lastDays(key);
  const rows = days.length
    ? days.map((d) => `<li><span>${esc(dayName(d.day))}</span><span class="bar"><i style="flex:${d.ok};background:var(--ok)"></i><i style="flex:${d.n - d.ok};background:var(--danger)"></i></span><span>${d.ok}/${d.n}</span><span>${pct(d.ok / d.n)}%</span></li>`).join('')
    : '<li class="none">Not played yet</li>';
  return `<div class="choice"><button type="button" class="tick" role="checkbox" aria-checked="${on}" aria-label="${esc(name)}" data-group="${group}" data-key="${key}"><i>${TICK}</i></button>`
    + `<button type="button" class="name" aria-expanded="${open}" data-unfold="${key}">${esc(name)}<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M4 6l4 4 4-4" ${STROKE}/></svg></button></div>`
    + (open ? `<ul class="days" aria-label="${esc(name)}: last five days played">${rows}</ul>` : '');
}
function renderSettings() {
  $('settings').innerHTML = '<h3>Questions</h3>' + Object.entries(TYPES).map(([k, name]) => choice('types', k, name)).join('')
    + '<h3>Streets</h3>' + Object.entries(STREETS).map(([k, name]) => choice('streets', k, name)).join('')
    + '<p class="note">Spots are dealt at random with the ranges, pot and bet sizes set up in <a href="study.html">Study</a>. A turn takes a few seconds to solve, a flop up to a minute.</p>';
}
$('open-settings').onclick = () => { renderSettings(); open('settings'); };
$('settings').addEventListener('click', (ev) => {
  const name = ev.target.closest('[data-unfold]');
  if (name) { const k = name.dataset.unfold; if (unfolded.has(k)) unfolded.delete(k); else unfolded.add(k); renderSettings(); $('settings').querySelector(`[data-unfold="${k}"]`)?.focus({ preventScroll: true }); return; }
  const box = ev.target.closest('.tick'); if (!box) return;
  const { group, key } = box.dataset;
  // one of each has to stay on
  if (store[group][key] && Object.values(store[group]).filter(Boolean).length === 1) return;
  store[group][key] = !store[group][key]; save();
  if (group === 'streets') {
    // boards solved ahead on a street no longer wanted are dropped, and one being solved is left to finish unseen
    game.boards = game.boards.filter((b) => store.streets[b.street]);
    if (game.busy && !store.streets[game.busy.street]) { game.busy = null; game.progress = null; }
    if (game.board && !store.streets[game.board.street] && !game.q?.done) { game.board = null; advance(); } else { want(); if (!game.q) renderAsk(); }
  } else if (game.q && !game.q.done && !store.types[game.q.type]) advance();
  renderSettings(); $('settings').querySelector(`[data-key="${key}"]`)?.focus({ preventScroll: true });
});
const openRows = new Set();
function renderHistory() {
  const t = today();
  const row = (e) => {
    const open = openRows.has(e.t);
    const where = !e.line?.length ? 'first to act' : e.line[e.line.length - 1] === 'X' ? 'checked to' : `facing ${e.line[e.line.length - 1]}`;
    return `<li class="${e.ok ? 'good' : 'bad'}"><button type="button" class="past" aria-expanded="${open}" data-row="${e.t}"><i class="mark">${e.ok ? TICK : CROSS}</i><span class="q"><span>${esc(TYPES[e.type] ?? e.type)}${e.hand ? ` <b>${cardsHtml(e.hand)}</b>` : ''}</span><span class="spot"><b>${cardsHtml(e.board)}</b> ${seatName(e.seat)} ${esc(where)}</span></span></button>`
      + (open ? `<dl><dt>Your answer</dt><dd>${esc(e.mine)}</dd><dt>Right answer</dt><dd>${esc(e.right)}</dd><dt>Why</dt><dd>${e.why.map((p) => `<p>${esc(p)}</p>`).join('')}${e.explained ? '' : '<p class="soon">Fuller explanations are written for the river only for now.</p>'}</dd></dl>` : '') + '</li>';
  };
  $('history').innerHTML = `<div class="total"><span class="big"><b>${t.ok}</b>/${t.n}</span><span>${t.n ? `${pct(t.ok / t.n)}% today` : 'Nothing answered today'}</span></div>`
    + (store.log.length ? `<h3>Last questions</h3><ul class="log">${store.log.map(row).join('')}</ul>` : '');
}
$('score').onclick = () => { renderHistory(); open('history'); };
$('history').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-row]'); if (!b) return;
  const t = +b.dataset.row; if (openRows.has(t)) openRows.delete(t); else openRows.add(t);
  renderHistory(); $('history').querySelector(`[data-row="${t}"]`)?.focus({ preventScroll: true });
});

render();
want();
renderAsk();
