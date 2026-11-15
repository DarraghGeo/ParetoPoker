<!-- Each card that can come next, weakest for this hand first, against the equity the hand has then; the range the same
     way, faded; the equity now as a line across. -->
<script>
  import CurveFrame from '../common/CurveFrame.svelte';
  import { pct } from '../../lib/cards.js';
  import { stepsOf, yOf } from '../../lib/curve.js';
  let { spread } = $props();
  const SW = 560, SH = 220, PAD = 10; const Y = yOf(SH, PAD);
  const even = (list) => stepsOf(list.map((v) => ({ w: 1, e: v.eq })), Y, SW).points;
  const alone = $derived(!spread.hand.length);
</script>
<div class="spread"><CurveFrame h={SH} pad={PAD} width={SW} label="Equity on each {spread.street} card">
  <line class="now" x1="0" x2={SW} y1={Y(spread.now)} y2={Y(spread.now)} />
  {#if !alone}<polyline class="wait" points={even(spread.range)} />{/if}<polyline class="act" points={even(alone ? spread.range : spread.hand)} />
</CurveFrame>
<div class="cap"><span>Equity {pct(spread.now)}%</span>{#if spread.equityNow != null}<span>Equity now {pct(spread.equityNow)}%</span>{/if}{#if spread.drawEquity != null}<span>Draw equity {pct(spread.drawEquity)}%</span>{/if}</div></div>
