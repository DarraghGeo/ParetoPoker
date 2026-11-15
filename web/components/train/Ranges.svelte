<!-- What sits above the question: the two ranges side by side, their equity curves, or the ladder of both on one scale. -->
<script>
  import RangeChart from '../common/RangeChart.svelte';
  import Curve from './Curve.svelte';
  import Ladder from './Ladder.svelte';
  import { cellOf } from '../../lib/cards.js';
  import { seatName } from '../../lib/train/spotText.js';
  let { spot, view, hand = null } = $props();
  const other = (seat) => (seat === 'oop' ? 'ip' : 'oop');
</script>
{#if !spot || view === 'grid'}
  <div class="minis">
    <RangeChart title={spot ? `Hero ${seatName(spot.decision.seat)}` : 'Hero'} hands={spot?.hero ?? null} marked={hand ? cellOf(hand) : null} />
    <RangeChart title={spot ? `Villain ${seatName(other(spot.decision.seat))}` : 'Villain'} hands={spot?.villain ?? null} villain />
  </div>
{:else if view === 'curve'}<Curve hero={spot.hero} villain={spot.villain} {hand} />
{:else}<Ladder hero={spot.hero} villain={spot.villain} seat={spot.decision.seat} {hand} />{/if}
