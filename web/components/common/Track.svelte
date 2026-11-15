<!-- A progress bar: how far along a solve is, never quite empty. -->
<script>let { done = 0 } = $props();</script>
<div class="track"><i style="width:{(100 * Math.max(0.04, done)).toFixed(1)}%"></i></div>
