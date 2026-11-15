<!-- Cards in their suit colours: "As Kd" as A♠ K♦. -->
<script>
  import { cardList } from '../../lib/cards.js';
  let { cards = '', slots = 0 } = $props();
  const list = $derived(cardList(cards));
</script>
{#each list as c}<span class="s-{c.suit}">{c.rank}{c.glyph}</span>{/each}{#each { length: Math.max(0, slots - list.length) } as _}<span class="slot"></span>{/each}
