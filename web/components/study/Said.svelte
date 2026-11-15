<!-- A sentence of the explanation; the numbers behind it, where there are any, open under it on a tap. -->
<script>
  let { text, detail = '', quiet = false, lead = false } = $props();
  let open = $state(false);
  const key = (ev) => { if (ev.key !== 'Enter' && ev.key !== ' ') return; ev.preventDefault(); open = !open; };
</script>
{#if detail}<!-- svelte-ignore a11y_no_noninteractive_element_to_interactive_role --><p class:quiet class:lead class:open data-more tabindex="0" role="button" aria-expanded={open} title={detail} onclick={() => (open = !open)} onkeydown={key}><span class="t">{text}</span><small>{detail}</small></p>
{:else}<p class:quiet class:lead>{text}</p>{/if}
