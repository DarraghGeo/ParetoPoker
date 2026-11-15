<!-- Every card, a row a suit; the ones in use cannot be taken. Under them, one button deals at random the street of the
     card at board place `index`. -->
<script>
  import { GLYPH, RANKS } from '../../lib/cards.js';
  let { gone, now = null, index, onpick, onrandom } = $props();
  const street = $derived(index < 3 ? 'flop' : index === 3 ? 'turn' : 'river');
</script>
{#each [...'shdc'] as suit}<div>{#each [...RANKS] as rank}{@const card = rank + suit}
  <button type="button" class="s-{suit}" disabled={gone.has(card) && card !== now} aria-pressed={card === now} aria-label={card} onclick={() => onpick(card)}>{rank}{GLYPH[suit]}</button>
{/each}</div>{/each}
<button type="button" class="random" onclick={onrandom}>Random {street}</button>
