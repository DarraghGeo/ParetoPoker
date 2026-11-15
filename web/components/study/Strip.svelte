<!-- The strategy along the range, lowest equity to highest, one column a hand: one bar, a row for each made hand (each in its
     place on the same scale), or the ladder of both ranges. Slide a thumb along it and the hand under it is picked. -->
<script>
  import Ladder from '../common/Ladder.svelte';
  import { bands } from '../../lib/actions.js';
  import { pct } from '../../lib/cards.js';
  import { splitRows } from '../../lib/study/charts.js';
  import { pickHand, setHand } from '../../lib/study/solving.js';
  let { game, strata, hands } = $props();
  const form = $derived(game.views.chart === 'ladder' ? 'ladder' : game.views.chart === 'split' && game.decision?.categories ? 'split' : 'single');
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
{:else if form === 'ladder'}<Ladder hero={hands.hero} villain={hands.villain} seat={game.decision.seat} cell={column} {...events} />
{:else if form === 'split'}<div class="rows" {...events}>{#each splitRows(hands.hero, game.decision.categories) as r (r.category)}
  <div class="row"><div class="strip">{#each r.hands as h}{#if h}{@render column(h)}{:else}<span></span>{/if}{/each}</div><span class="name" style={r.place}><span class="long">{r.name}</span><span class="short">{r.short}</span> {pct(r.share)}</span></div>
{/each}</div>
{:else}<div class="strip" {...events}>{#each hands.hero as h}{@render column(h)}{/each}</div>{/if}
