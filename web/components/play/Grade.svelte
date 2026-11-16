<!-- How hero's last move stands against the solution: a coloured dot and what the solver does, on a small card that slides up by his seat, stays a few seconds and
     slides away. A tap opens the decision in Study. -->
<script>
  import { fly } from 'svelte/transition';
  let { grade, onopen } = $props();
  const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
</script>
<button type="button" class="grade g-{grade.level}" aria-live="polite" title="Open this decision in Study" onclick={onopen} in:fly={{ y: calm ? 0 : 18, duration: calm ? 0 : 260 }} out:fly={{ y: calm ? 0 : 18, duration: calm ? 0 : 320 }}>
  <i aria-hidden="true"></i><span>{grade.detail}</span><b aria-hidden="true">›</b>
</button>
