<!-- Study: a spot solved, its line walked decision by decision, the range and each hand with what it does and why. Inside
     another page's Study pane (`embedded`) the way home is the pane's back bar, and its left edge is the swipe back. -->
<script>
  import Bar from '../common/Bar.svelte';
  import CopyButton from '../common/CopyButton.svelte';
  import Icon from '../common/Icon.svelte';
  import Logo from '../common/Logo.svelte';
  import Board from './Board.svelte';
  import Chart from './Chart.svelte';
  import Combos from './Combos.svelte';
  import Editor from './Editor.svelte';
  import Group from './Group.svelte';
  import LineNav from './LineNav.svelte';
  import Loader from './Loader.svelte';
  import SeatMenu from './SeatMenu.svelte';
  import Setup from './Setup.svelte';
  import Strip from './Strip.svelte';
  import Versions from './Versions.svelte';
  import Why from './Why.svelte';
  import { strataOf } from '../../lib/actions.js';
  import { heroHands, villainHands } from '../../lib/hands.js';
  import { swipe } from '../../lib/swipe.js';
  import { openEditor } from '../../lib/study/editor.svelte.js';
  import { openSetup } from '../../lib/study/setup.js';
  import { turnTo } from '../../lib/study/solving.js';
  import { spotText } from '../../lib/study/spotText.js';
  let { game, embedded = false, active = true } = $props();
  const strata = $derived(game.decision ? strataOf(game.decision.actions) : []);
  const hands = $derived(game.survey ? { hero: heroHands(game.survey), villain: villainHands(game.decision, game.survey) } : null);
  const fixed = $derived(!!game.versions[game.at]?.fixed);
  const turn = { when: (t) => t.clientX >= (embedded ? 28 : 0), done: (dx) => turnTo(game, game.at + (dx < 0 ? 1 : -1)) };
</script>
<div class="rule">{#if game.survey}<Bar mix={game.survey.mix} {strata} />{/if}</div>
<main>
  <header>
    {#if !embedded}<Logo />{/if}
    <Board {game} /><Versions {game} {active} /><span class="grow"></span>
    <SeatMenu {game} />
    <CopyButton text={() => spotText(game)} label="Copy this spot" />
    {#if !fixed}<button type="button" class="icon" aria-label="Edit ranges" title="Edit ranges" onclick={() => openEditor(game)}><Icon name="pen" /></button>{/if}
    <button type="button" class="icon" aria-label="Setup" onclick={() => openSetup(game)}><Icon name="settings" /></button>
  </header>
  <section class="stage {game.slide}" use:swipe={turn}>
    <div class="left">
      <LineNav {game} {strata} />
      <div class="box"><Chart {game} {strata} {hands} /></div>
      <div class="stripbox"><Strip {game} {strata} {hands} /></div>
      <Combos {game} {strata} />
    </div>
    <Why {game} {strata} />
  </section>
</main>
<Loader {game} /><Setup {game} /><Editor {game} /><Group {game} {strata} />
