<!-- A player at the table: the hole cards (face down until shown), a plate with the name, who they are and the stack,
     the dealer's button for the seat in position, and the clock when it is theirs to act. -->
<script>
  import Cards from '../common/Cards.svelte';
  import { chips } from '../../lib/actions.js';
  let { name, tag, cards = null, behind, clock = null, bank = 0, dealer = false, hero = false } = $props();
  const share = $derived(clock ? Math.max(0, Math.min(1, clock.left / clock.total)) : 0);
</script>
<section class="seat" class:hero class:villain={!hero} class:acting={!!clock} aria-label={name}>
  <div class="hole">{#if cards}<Cards {cards} />{:else}<span class="back" aria-hidden="true"></span><span class="back" aria-hidden="true"></span>{/if}</div>
  <div class="plate">
    <div class="who"><span class="name">{name}</span><span class="pos">{tag}</span>{#if dealer}<span class="dealer" title="The button">D</span>{/if}</div>
    <div class="stack">{chips(behind)}</div>
    <div class="clock" class:bank={clock?.bank} aria-hidden={!clock}><i style="width:{(100 * share).toFixed(1)}%"></i></div>
    <div class="time">{#if clock}{clock.bank ? 'Time bank ' : ''}{Math.ceil(clock.left)}s{:else}Bank {Math.ceil(bank)}s{/if}</div>
  </div>
</section>
