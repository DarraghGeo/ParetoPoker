<!-- The two ranges' equity curves: each hand's equity, lowest to highest, along the width its weight takes; hero in ink. -->
<script>
  let { hero, villain, hand = null } = $props();
  const W = 560, H = 350, PAD = 8;
  const Y = (y) => H - PAD - y * (H - 2 * PAD);
  /** A range as steps along the width, and where each hand's step is centred. */
  function steps(list) {
    const total = list.reduce((t, r) => t + r.w, 0); let x = 0; const pts = []; const mid = new Map();
    for (const r of list) { const w = r.w / total; pts.push(`${(x * W).toFixed(1)},${Y(r.e).toFixed(1)} ${((x + w) * W).toFixed(1)},${Y(r.e).toFixed(1)}`); mid.set(r.name, { x: x + w / 2, e: r.e }); x += w; }
    return { points: pts.join(' '), mid };
  }
  const mine = $derived(steps(hero)); const his = $derived(steps(villain));
  const pick = $derived(hand ? mine.mid.get(hand) : null);
</script>
<div class="curve"><svg viewBox="0 0 {W} {H}" role="img" aria-label="Equity distribution: hero in ink, villain faded">
  {#each [0.25, 0.5, 0.75] as v}<line class="gridl" x1="0" x2={W} y1={Y(v)} y2={Y(v)} />{/each}
  <line class="axis" x1="0" x2={W} y1={Y(0)} y2={Y(0)} /><polyline class="wait" points={his.points} /><polyline class="act" points={mine.points} />
  {#if pick}<circle class="dot" cx={(pick.x * W).toFixed(1)} cy={Y(pick.e).toFixed(1)} r="5" />{/if}
</svg></div>
