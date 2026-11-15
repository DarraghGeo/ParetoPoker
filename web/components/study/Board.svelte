<!-- The board in the header: every card a button (tap one, pick another from the cards that drop down under it; the turn
     or river tapped twice comes off), and where no card has been dealt along the line, faint boxes to add the next one. -->
<script>
  import CardGrid from './CardGrid.svelte';
  import Popover from '../common/Popover.svelte';
  import { GLYPH } from '../../lib/cards.js';
  import { ownBoard, placeCard, placeRandom, roundOf, setBoard, shownBoard } from '../../lib/study/board.js';
  let { game } = $props();
  const own = $derived(ownBoard(game)); const shown = $derived(shownBoard(game));
  const empty = $derived(roundOf(game) === 0 ? 5 - own.length : 0);
  let picking = $state(null); let open = $state(false); let tapped = { i: -1, at: 0 };
  const removable = (i, adding) => !adding && i >= 3 && i < own.length;
  function tap(ev, i, adding) {
    const twice = tapped.i === i && Date.now() - tapped.at < 450; tapped = twice ? { i: -1, at: 0 } : { i, at: Date.now() };
    if (twice && removable(i, adding)) { open = false; setBoard(game, own.slice(0, i)); return; }
    if (open && picking?.i === i && picking.adding === adding) { open = false; return; }
    picking = { i, adding, anchor: ev.currentTarget }; open = true;
  }
  function chosen(work) { const p = picking; open = false; work(p); }
</script>
<div class="board">
  {#each shown as c, i}<button type="button" class="s-{c[1]}" class:dealt={i >= own.length} aria-label="Change {c}{removable(i, false) ? '; double tap to remove' : ''}" onclick={(ev) => tap(ev, i, false)}>{c[0]}{GLYPH[c[1]]}</button>{/each}
  {#each { length: empty } as _, k}<button type="button" class="slot" data-later={k ? '1' : undefined} aria-label="Add the {own.length + k === 3 ? 'turn' : 'river'}" onclick={(ev) => tap(ev, own.length, true)}></button>{/each}
</div>
<Popover bind:open anchor={picking?.anchor} class="deal" label="Board card">
  <CardGrid gone={new Set(shown)} now={shown[picking.i]} index={picking.i} onpick={(card) => chosen((p) => placeCard(game, p.i, p.adding, card))} onrandom={() => chosen((p) => placeRandom(game, p.i, p.adding))} />
</Popover>
