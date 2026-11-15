<!-- A drawer from the right over a scrim: shut by the scrim or Escape. -->
<script>
  let { open = $bindable(false), label, children } = $props();
  let box = $state();
  $effect(() => { if (open) box?.focus({ preventScroll: true }); });
</script>
<svelte:window onkeydown={(ev) => { if (ev.key === 'Escape') open = false; }} />
{#if open}
  <div class="scrim" role="presentation" onclick={() => (open = false)}></div>
  <section class="drawer" aria-label={label} tabindex="-1" bind:this={box}>{@render children()}</section>
{/if}
