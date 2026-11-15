<!-- The two ranges' equity curves: each hand's equity, lowest to highest, along the width its weight takes; the range to
     act in ink, the other faded, an earlier version's dotted (`ghost`), a cap on equity as a ceiling. -->
<script>
  import CurveFrame from './CurveFrame.svelte';
  import { W, stepsOf, yOf } from '../../lib/curve.js';
  let { hero, villain, hand = null, ghost = null, ceiling = null, id = undefined } = $props();
  const H = 350; const Y = yOf(H, 8);
  const mine = $derived(stepsOf(hero, Y)); const his = $derived(stepsOf(villain, Y));
  const pick = $derived(hand ? mine.mid.get(hand) : null);
</script>
<div class="curve" {id}><CurveFrame h={H} label="Equity distribution: the range to act in ink, the other faded" {ceiling}>
  {#if ghost}<polyline class="ghost" points={ghost} />{/if}
  <polyline class="wait" points={his.points} /><polyline class="act" points={mine.points} />
  {#if pick}<circle class="dot" cx={(pick.x * W).toFixed(1)} cy={Y(pick.e).toFixed(1)} r="5" />{/if}
</CurveFrame></div>
