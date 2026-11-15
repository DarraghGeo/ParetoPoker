<!-- A hand's equity on each card that can come next, weakest first, drawn small: the dotted line is its equity now. -->
<script>
  import { stepsOf } from '../../lib/curve.js';
  let { list, now } = $props();
  const SW = 60, SH = 24; const Y = (e) => SH - 1 - e * (SH - 2);
  const points = $derived(stepsOf(list.map((e) => ({ w: 1, e })), Y, SW).points);
</script>
<svg class="spark" viewBox="0 0 {SW} {SH}" preserveAspectRatio="none" aria-hidden="true"><line class="mid" x1="0" x2={SW} y1={Y(0.5)} y2={Y(0.5)} /><line class="now" x1="0" x2={SW} y1={Y(now)} y2={Y(now)} /><polyline {points} /></svg>
