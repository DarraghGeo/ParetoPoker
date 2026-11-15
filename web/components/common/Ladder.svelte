<!-- The ladder: every hand of both ranges on one scale, lowest equity to highest, out of position's above and in position's
     below; a hand takes a column, hands with the same equity (to a tenth of a percent) share columns. `cell` draws a hand
     of the range to act (plain, marked where `hand` sits, by default); the rest of the root's attributes pass through. -->
<script>
  let { hero, villain, seat, hand = null, cell = null, ...rest } = $props();
  /** Both ranges' hands grouped by equity level, lowest first, hands of one level by name. */
  function levels() {
    const by = new Map(); const at = (e) => { const k = Math.round(1e3 * e); if (!by.has(k)) by.set(k, { hero: [], villain: [] }); return by.get(k); };
    for (const h of hero) at(h.e).hero.push(h);
    for (const v of villain) at(v.e).villain.push(v);
    return [...by.keys()].sort((a, b) => a - b).map((k) => by.get(k)).map((l) => ({ ...l, hero: l.hero.sort((a, b) => (a.name < b.name ? -1 : 1)) }));
  }
  /** The two rows, column for column: the range to act's hands and the other's, each null where the other row has one. */
  const rows = $derived.by(() => {
    const mine = []; const his = [];
    for (const l of levels()) for (let i = 0; i < Math.max(l.hero.length, l.villain.length); i++) { mine.push(l.hero[i] ?? null); his.push(l.villain[i] ?? null); }
    return seat === 'oop' ? [[mine, true, 'Out of position, to act'], [his, false, 'In position']] : [[his, false, 'Out of position'], [mine, true, 'In position, to act']];
  });
</script>
<div class="rows ladder" {...rest}>{#each rows as [cells, acting, label]}<div class="row"><div class="strip" role="group" aria-label={label}>
  {#each cells as h}{#if !h}<span></span>{:else if !acting}<span class="other" title={h.name}></span>{:else if cell}{@render cell(h)}{:else}<span class={h.name === hand ? 'hero mark' : 'hero'}></span>{/if}{/each}
</div></div>{/each}</div>
