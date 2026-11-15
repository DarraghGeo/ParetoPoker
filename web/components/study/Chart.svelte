<!-- The chart above the strip: the range on the grid or the two equity curves, or the cards to pick from at a deal. -->
<script>
  import Curve from '../common/Curve.svelte';
  import CardGrid from './CardGrid.svelte';
  import RangeGrid from './RangeGrid.svelte';
  import { dealAt, dealRandom, goneAt, ownBoard } from '../../lib/study/board.js';
  import { stepsOf, yOf } from '../../lib/curve.js';
  import { version } from '../../lib/study/versions.svelte.js';
  let { game, strata, hands } = $props();
  const chance = $derived(game.pick != null ? game.nodes[game.pick] : null);
  // the same decision in the version before stays as a dotted line
  const points = $derived(hands ? stepsOf(hands.hero, yOf(350, 8)).points : '');
  $effect(() => { if (game.views.view === 'curve' && points) version(game).curves.set(game.node, points); });
  const ghost = $derived(game.at > 0 ? game.versions[game.at - 1].curves.get(game.node) : null);
  const cap = $derived(game.decision ? version(game).dials[game.decision.seat].cap : 1);
</script>
{#if chance}<div class="deal" role="group" aria-label="Card dealt"><CardGrid gone={goneAt(game, chance)} now={game.dealt[chance.round]} index={ownBoard(game).length + chance.round} onpick={(card) => dealAt(game, card)} onrandom={() => dealRandom(game)} /></div>
{:else if game.views.view === 'grid'}<RangeGrid {game} {strata} />
{:else if hands}<Curve id="dist" hero={hands.hero} villain={hands.villain} hand={game.hand} {ghost} ceiling={cap < 1 ? cap : null} />{/if}
