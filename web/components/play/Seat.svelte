<!-- A player at the table: name and position, cards (face down until shown), what is behind, and the last action. -->
<script>
  import Cards from '../common/Cards.svelte';
  let { name, seat, cards = null, behind, last = '', acting = false, big = false } = $props();
  const num = (x) => String(Math.round(10 * x) / 10);
</script>
<section class="seat" class:acting class:hero={big} class:villain={!big} aria-label={name}>
  <div class="who"><span class="name">{name}</span><span class="pos">{seat === 'oop' ? 'OOP' : 'IP'}</span></div>
  <div class="hole" class:big>{#if cards}<Cards {cards} />{:else}<span class="back" aria-hidden="true"></span><span class="back" aria-hidden="true"></span>{/if}</div>
  <div class="stack">{num(behind)} behind</div><div class="last">{last}</div>
</section>
