<!-- The ladder: every hand of both ranges on one scale, lowest equity to highest, out of position's above and in position's
     below; a hand takes a column, hands with the same equity (to a tenth of a percent) share columns. -->
<script>
  let { hero, villain, seat, hand = null } = $props();
  /** Both ranges' hands grouped by equity level, lowest first. */
  function levels() {
    const by = new Map(); const at = (e) => { const k = Math.round(1e3 * e); if (!by.has(k)) by.set(k, { hero: [], villain: [] }); return by.get(k); };
    for (const h of hero) at(h.e).hero.push(h);
    for (const v of villain) at(v.e).villain.push(v);
    return [...by.keys()].sort((a, b) => a - b).map((k) => by.get(k));
  }
  /** The two rows of cells: hero's (marked where his hand sits) and villain's, column for column. */
  const rows = $derived.by(() => {
    const mine = []; const his = [];
    for (const l of levels()) for (let i = 0; i < Math.max(l.hero.length, l.villain.length); i++) { mine.push(l.hero[i] ? (l.hero[i].name === hand ? 'hero mark' : 'hero') : ''); his.push(l.villain[i] ? 'other' : ''); }
    return seat === 'oop' ? [[mine, 'Out of position, hero'], [his, 'In position, villain']] : [[his, 'Out of position, villain'], [mine, 'In position, hero']];
  });
</script>
<div class="rows ladder">{#each rows as [cells, label]}<div class="row"><div class="strip" role="img" aria-label={label}>{#each cells as c}<span class={c}></span>{/each}</div></div>{/each}</div>
