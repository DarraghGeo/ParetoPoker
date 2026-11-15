<!-- The analytical look: how equity is spread over the next card, and the names of hands in the range with what each does
     (with a hand picked, only the names it carries). A name opens the hands that carry it. -->
<script>
  import Bar from '../common/Bar.svelte';
  import Spread from './Spread.svelte';
  import { pct } from '../../lib/cards.js';
  import { askOnce, handKey } from '../../lib/study/asks.js';
  let { game, row, strata } = $props();
  const combo = $derived(row ? row.hand.id : null);
  const key = $derived(handKey(game, combo)); const look = $derived(game.looked.get(key));
  $effect(() => { if (!look) askOnce(game, `look|${key}`, { type: 'analysis', combo }); });
  const types = $derived(look ? look.types.filter((t) => !row || t.has) : []);
  const openGroup = (name) => { game.group = name; game.panel = 'group'; };
  const onKey = (ev, name) => { if (ev.key !== 'Enter' && ev.key !== ' ') return; ev.preventDefault(); openGroup(name); };
</script>
{#if !look}<p class="quiet">Working it out…</p>
{:else}
  {#if look.spread && (look.spread.hand.length || look.spread.range.length)}<Spread spread={look.spread} />{/if}
  <ul class="types" class:all={!row}>{#each types as t (t.name)}
    <!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role -->
    <li class:has={t.has} data-tag={t.name} role="button" tabindex="0" onclick={() => openGroup(t.name)} onkeydown={(ev) => onKey(ev, t.name)}><span class="mark">{row ? '✓' : ''}</span><span class="tname">{t.name}</span><span class="share">{pct(t.share)}%</span><span class="bar"><Bar mix={t.mix} {strata} /></span></li>
  {/each}</ul>
{/if}
