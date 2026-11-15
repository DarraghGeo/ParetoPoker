<!-- No hand picked: the range to act, what it does and why (with what would change it, both asked for once a decision),
     the two ranges set side by side, or the analytical look. -->
<script>
  import Look from './Look.svelte';
  import MixLine from './MixLine.svelte';
  import Said from './Said.svelte';
  import Tabs from './Tabs.svelte';
  import { seatName } from '../../lib/actions.js';
  import { askOnce, placeKey } from '../../lib/study/asks.js';
  import { rangeReasons } from '../../lib/study/why.js';
  let { game, strata } = $props();
  const d = $derived(game.decision); const here = $derived(game.nodes[game.node]);
  const key = $derived(placeKey(game)); const got = $derived(game.ranged.get(key)); const whatif = $derived(game.whatif.get(key));
  $effect(() => {
    if (game.tab === 'look') return;
    if (!got) askOnce(game, `range|${key}`, { type: 'range' }); else if (!whatif) askOnce(game, `whatif|${key}`, { type: 'whatif' });
  });
  const facts = $derived(game.spot?.facts ?? null);
</script>
<h2>{seatName(d.seat)} range</h2>
<MixLine mix={game.survey.mix} actions={d.actions} {strata} />
<Tabs {game} first="Range" />
{#if game.tab === 'look'}<Look {game} row={null} {strata} />
{:else}
  {#if !got}<p class="quiet">Working out the reasons…</p>{:else}{#if got.line}<p class="lead">{got.line}</p>{/if}{#each rangeReasons(got, whatif) as r}<Said {...r} />{/each}{/if}
  {#if facts}<table class="facts"><thead><tr><th></th><th>OOP</th><th>IP</th></tr></thead><tbody>{#each facts as [k, a, b]}<tr><th>{k}</th><td>{a}</td><td>{b}</td></tr>{/each}</tbody></table>
    {#if here.round > 0 || here.parent >= 0}<p class="quiet">The two ranges as the spot starts.</p>{/if}{/if}
{/if}
