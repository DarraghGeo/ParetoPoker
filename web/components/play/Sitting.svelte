<!-- Sitting down: who is at the table (live player types or online positions, several of each to rotate among, or Study's
     ranges) and the bet sizes, chosen before anything is solved. Nothing changes until Deal. -->
<script>
  import Sizes from './Sizes.svelte';
  import { ONLINE_ACTIONS, POOLS, TYPE_NAMES, seatsFor, spotsOf } from '../../lib/play/seating.js';
  let { seating, playing = false, stopped = null, ondeal, oncancel } = $props();
  let draft = $state(JSON.parse(JSON.stringify(seating)));
  const count = $derived(spotsOf(draft).length);
  /** Add or take away one choice of a list, never leaving it empty. */
  function flip(list, value) { const at = list.indexOf(value); if (at < 0) list.push(value); else if (list.length > 1) list.splice(at, 1); }
  function flipAction(value) {
    flip(draft.online.actions, value);
    for (const side of ['oop', 'ip']) { const seats = seatsFor(draft.online.actions, side); draft.online[side] = draft.online[side].filter((s) => seats.includes(s)); if (!draft.online[side].length) draft.online[side] = [seats[0]]; }
  }
</script>
{#snippet chips(name, list, options, onflip)}
  <div class="line"><span>{name}</span><div class="seg" role="group" aria-label={name}>{#each options as [value, label]}<button type="button" aria-pressed={list.includes(value)} onclick={() => onflip(value)}>{label}</button>{/each}</div></div>
{/snippet}
<section class="sitting" aria-label="Set up the table">
  <h2>Set up the table</h2>
  {#if stopped}<p class="said stopped">Play stopped by itself last time. {stopped.text} If this keeps happening, send me this.</p>{/if}
  <div class="presets">
    <div class="line"><span>Against</span><div class="seg" role="group" aria-label="Who you play against">{#each POOLS as [key, label]}<button type="button" aria-pressed={draft.pool === key} onclick={() => (draft.pool = key)}>{label}</button>{/each}</div></div>
    {#if draft.pool === 'live'}
      {@render chips('Caller', draft.live.oop, TYPE_NAMES.map((t) => [t, t]), (v) => flip(draft.live.oop, v))}
      {@render chips('Raiser', draft.live.ip, TYPE_NAMES.map((t) => [t, t]), (v) => flip(draft.live.ip, v))}
      <p class="said">The raiser is in position with the type's full range; the caller is out of position without JJ+, AK and AQs. Pick several of either and each hand takes one pairing at random. You are dealt either seat.</p>
    {:else if draft.pool === 'online'}
      {@render chips('Action', draft.online.actions, ONLINE_ACTIONS, flipAction)}
      {@render chips('OOP', draft.online.oop, seatsFor(draft.online.actions, 'oop').map((s) => [s, s]), (v) => flip(draft.online.oop, v))}
      {@render chips('IP', draft.online.ip, seatsFor(draft.online.actions, 'ip').map((s) => [s, s]), (v) => flip(draft.online.ip, v))}
      <p class="said">Pick several actions or seats and each hand takes one pairing at random from those that exist.</p>
    {:else}<p class="said">The two ranges, pot and stack as set up in Study.</p>{/if}
    <Sizes config={draft} onchange={(bets) => (draft.bets = bets)} />
  </div>
  <p class="count" class:none={!count}>{count === 0 ? 'No pairing of those seats exists. Pick others.' : count === 1 ? 'One spot.' : `${count} spots in rotation.`}</p>
  <div class="go"><button type="button" class="primary" disabled={!count} onclick={() => ondeal($state.snapshot(draft))}>Deal</button>{#if playing}<button type="button" class="link" onclick={oncancel}>Back to the table</button>{/if}</div>
</section>
