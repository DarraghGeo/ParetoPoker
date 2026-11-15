<!-- The editor's two curves, the range being edited in full ink with its knobs (drag one, or move it with the arrow keys),
     the range as given faded behind it, and the other range. -->
<script>
  import CurveFrame from '../common/CurveFrame.svelte';
  import { KNOBS } from '../../../src/warp/reshape.js';
  import { pct } from '../../lib/cards.js';
  import { W, stepsOf, yOf } from '../../lib/curve.js';
  import { askPreview, setKnob } from '../../lib/study/editor.svelte.js';
  let { game, side, other } = $props();
  const H = 300, PAD = 8; const Y = yOf(H, PAD);
  const d = $derived(game.edit.dials[game.edit.who]);
  const line = (list) => stepsOf(list.map(([w, e]) => ({ w, e })), Y).points;
  const clamp = (y) => Math.min(1, Math.max(0, y));
  const knobAt = (k) => clamp(side.knobs[k] + d.curve[k]);
  let svg = $state(); let grab = $state(null);
  function move(ev) {
    if (grab == null) return;
    const box = svg.getBoundingClientRect(); const y = clamp(1 - (((ev.clientY - box.top) / box.height) * H - PAD) / (H - 2 * PAD));
    setKnob(game, grab, Math.round(1000 * (y - side.knobs[grab])) / 1000);
  }
  const release = () => { if (grab == null) return; grab = null; askPreview(game); };
  function key(ev, k) {
    const step = ev.key === 'ArrowUp' ? 0.02 : ev.key === 'ArrowDown' ? -0.02 : 0; if (!step) return;
    ev.preventDefault(); setKnob(game, k, Math.round(100 * (d.curve[k] + step)) / 100);
  }
</script>
<svelte:window onpointermove={move} onpointerup={release} onpointercancel={release} />
<CurveFrame h={H} label="Equity distribution" ceiling={d.cap < 1 ? d.cap : null} bind:svg>
  <polyline class="ghost" points={line(side.base)} /><polyline class="wait" points={line(other.curve)} /><polyline class="act" points={line(side.curve)} />
  {#each KNOBS as x, k}<circle class="grab" cx={(x * W).toFixed(1)} cy={Y(knobAt(k)).toFixed(1)} r="7" tabindex="0" role="slider" aria-label="Equity at {Math.round(100 * x)}% of the range" aria-valuemin="0" aria-valuemax="100" aria-valuenow={pct(knobAt(k))} onpointerdown={(ev) => { ev.preventDefault(); grab = k; }} onkeydown={(ev) => key(ev, k)} />{/each}
</CurveFrame>
