<!-- The strategy along the range, lowest equity to highest, one column a hand: one bar, a row for each made hand (each in its
     place on the same scale), the ladder of both ranges, or the butterfly (both ranges back to back in rows by made hand).
     Slide a thumb along it and the hand under it is picked. -->
<script>
  import Ladder from '../common/Ladder.svelte';
  import { bands } from '../../lib/actions.js';
  import { pct } from '../../lib/cards.js';
  import { LINE_NAMES, butterflyRows, lined } from '../../lib/study/butterfly.js';
  import { splitRows } from '../../lib/study/charts.js';
  import { askOnce } from '../../lib/study/asks.js';
  import { pickHand, setHand } from '../../lib/study/solving.js';
  let { game, strata, hands } = $props();
  const form = $derived(game.views.chart === 'butterfly' ? 'butterfly' : game.views.chart === 'ladder' ? 'ladder' : game.views.chart === 'split' && game.decision?.categories ? 'split' : 'single');
  // the butterfly's equity lines need each hand's equity in its parts: asked of the worker once for the decision on screen
  const partsKey = $derived(game.decision ? `${game.job}|${game.node}|${game.dealt.join(',')}` : '');
  const wantLines = $derived(form === 'butterfly' && !!game.views.lines);
  $effect(() => { if (wantLines && hands && partsKey && game.parts?.key !== partsKey) askOnce(game, `parts|${partsKey}`, { type: 'parts', key: partsKey }); });
  const fly = $derived.by(() => {
    if (form !== 'butterfly' || !hands) return [];
    const rows = butterflyRows(hands, game.decision.boardText);
    return wantLines && game.parts?.key === partsKey && game.parts.by ? lined(rows, game.parts.by, game.decision) : rows;
  });
  const scrub = { on: false, moved: false, x: 0 };
  const columnAt = (x, y) => document.elementFromPoint(x, y)?.closest?.('#strip [data-hand]');

  /** The hand whose column is across the chart at x; with several rows, in the row nearest y that has a hand there. */
  function handAt(root, x, y) {
    const inner = root.querySelectorAll('.strip'); let best = null; let gap = Infinity;
    for (const row of inner.length ? [...inner] : [root]) {
      const r = row.getBoundingClientRect(); const mid = r.top + r.height / 2; const b = columnAt(Math.min(r.right - 1, Math.max(r.left, x)), mid);
      if (b && Math.abs(y - mid) < gap) { gap = Math.abs(y - mid); best = b.dataset.hand; }
    }
    return best;
  }
  function down(ev) {
    if (ev.button > 0 || !game.survey) return;
    Object.assign(scrub, { on: true, moved: false, x: ev.clientX });
    try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch { /* a pointer that cannot be held */ }
  }
  function move(ev) {
    if (!scrub.on || !(scrub.moved ||= Math.abs(ev.clientX - scrub.x) > 4)) return;
    const name = handAt(ev.currentTarget, ev.clientX, ev.clientY);
    if (name && name !== game.hand) { setHand(game, name); game.scrub = true; }
  }
  function up(ev) {
    if (!scrub.on) return; scrub.on = false;
    if (game.scrub) { game.scrub = false; return; }
    const b = ev.type === 'pointerup' && !scrub.moved ? columnAt(ev.clientX, ev.clientY) : null;
    if (b) pickHand(game, b.dataset.hand);
  }
  // the keyboard still picks a column with Enter or the space bar: a click that no pointer made
  function key(ev) { const b = ev.detail === 0 && ev.target.closest('[data-hand]'); if (b) pickHand(game, b.dataset.hand); }
  const events = { id: 'strip', onpointerdown: down, onpointermove: move, onpointerup: up, onpointercancel: up, onclick: key };
</script>
{#snippet column(h)}<button type="button" data-hand={h.name} aria-pressed={h.name === game.hand} aria-label={h.name}><b style="height:100%;background:{bands(h.row.hand.strategy, strata)}"></b></button>{/snippet}
{#if !hands}<div class="strip" {...events}></div>
{:else if form === 'butterfly'}<div class="fly" {...events}>{#each fly as r (r.lv)}
  <div class="frow"><div class="wing me"><div class="strip" style="width:{r.mine.toFixed(2)}%">{#each r.hero as h}<button type="button" data-hand={h.name} aria-pressed={h.name === game.hand} aria-label={h.name} style="flex:{h.w} 1 0"><b style="height:100%;background:{bands(h.row.hand.strategy, strata)}"></b></button>{/each}{#if r.points}<svg class="eq" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points={r.points} /></svg>{/if}</div></div><span class="code" title="{r.name}: {pct(r.share)}% of the range to act, {pct(r.hisShare)}% of the other{r.shown ? `. Line: ${LINE_NAMES[r.shown]}, ${pct(r.from)} to ${pct(r.to)}%` : ''}">{r.code}</span><div class="wing him"><i style="width:{r.his.toFixed(2)}%"></i></div></div>
{/each}</div>
{:else if form === 'ladder'}<Ladder hero={hands.hero} villain={hands.villain} seat={game.decision.seat} cell={column} {...events} />
{:else if form === 'split'}<div class="rows" {...events}>{#each splitRows(hands.hero, game.decision.categories) as r (r.category)}
  <div class="row"><div class="strip">{#each r.hands as h}{#if h}{@render column(h)}{:else}<span></span>{/if}{/each}</div><span class="name" style={r.place}><span class="long">{r.name}</span><span class="short">{r.short}</span> {pct(r.share)}</span></div>
{/each}</div>
{:else}<div class="strip" {...events}>{#each hands.hero as h}{@render column(h)}{/each}</div>{/if}
