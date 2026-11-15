<!-- What sits above the question: the two ranges side by side, their equity curves, or the ladder of both on one scale;
     for a question on the ranges themselves (`show`), the chart it asks about (one shown only once it is answered sits
     with the answer, in Ask). -->
<script>
  import RangeChart from '../common/RangeChart.svelte';
  import Curve from '../common/Curve.svelte';
  import Ladder from '../common/Ladder.svelte';
  import { cellOf } from '../../lib/cards.js';
  import { seatName } from '../../lib/actions.js';
  let { spot, view, hand = null, show = null, done = false } = $props();
  const other = (seat) => (seat === 'oop' ? 'ip' : 'oop');
</script>
{#if show}
  {#if !show.after}<div class="minis" class:solo={show.charts.length === 1}>{#each show.charts as c}<RangeChart title={c.title} hands={c.hands} villain={!!c.villain} marked={c.marked ? cellOf(c.marked) : null} />{/each}</div>{/if}
{:else if !spot || view === 'grid'}
  <div class="minis">
    <RangeChart title={spot ? `Hero ${seatName(spot.decision.seat)}` : 'Hero'} hands={spot?.hero ?? null} marked={hand ? cellOf(hand) : null} />
    <RangeChart title={spot ? `Villain ${seatName(other(spot.decision.seat))}` : 'Villain'} hands={spot?.villain ?? null} villain />
  </div>
{:else if view === 'curve'}<Curve hero={spot.hero} villain={spot.villain} {hand} />
{:else}<Ladder hero={spot.hero} villain={spot.villain} seat={spot.decision.seat} {hand} />{/if}
