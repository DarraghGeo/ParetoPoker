<!-- How hero's last move stands against the solution: a small card that slides up by his seat, stays a few seconds and
     slides away (a tap sends it off sooner). -->
<script>
  import { fly } from 'svelte/transition';
  let { grade, onclose } = $props();
  const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
</script>
<button type="button" class="grade g-{grade.level}" aria-live="polite" onclick={onclose} in:fly={{ y: calm ? 0 : 18, duration: calm ? 0 : 260 }} out:fly={{ y: calm ? 0 : 18, duration: calm ? 0 : 320 }}>
  <i aria-hidden="true"></i><span><b>{grade.word}</b><small>{grade.detail}</small></span>
</button>
