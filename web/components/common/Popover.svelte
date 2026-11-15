<!-- A small box that drops down under the button that opened it (`anchor`), kept on screen; shut by a tap elsewhere or Escape. -->
<script>
  let { open = $bindable(false), anchor, align = 'left', gap = 10, class: cls = '', label, role = 'group', children } = $props();
  let box = $state(); let place = $state('');
  $effect(() => { if (open && box && anchor) place = placed(anchor.getBoundingClientRect(), box.offsetWidth); });
  function placed(r, width) {
    const want = align === 'center' ? r.left + r.width / 2 - width / 2 : align === 'right' ? r.right - width : r.left;
    return `top:${r.bottom + gap}px;left:${Math.max(12, Math.min(want, innerWidth - width - 12))}px`;
  }
  const outside = (ev) => { if (open && !box?.contains(ev.target) && !anchor?.contains(ev.target)) open = false; };
</script>
<svelte:document onpointerdown={outside} onkeydown={(ev) => { if (ev.key === 'Escape') open = false; }} />
{#if open}<div class="pop {cls}" {role} aria-label={label} bind:this={box} style={place}>{@render children()}</div>{/if}
