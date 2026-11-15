<!-- Play: whole hands heads up against the solved villain, flop to river, with Study beside it for the decision on screen. -->
<script>
  import Cards from '../common/Cards.svelte';
  import Icon from '../common/Icon.svelte';
  import Logo from '../common/Logo.svelte';
  import Past from '../common/Past.svelte';
  import RangeChart from '../common/RangeChart.svelte';
  import StudyPane from '../common/StudyPane.svelte';
  import Moves from './Moves.svelte';
  import Seat from './Seat.svelte';
  import { cellOf } from '../../lib/cards.js';
  import { studyUrl } from '../../lib/links.js';
  import { createPlayGame } from '../../lib/play/game.svelte.js';

  const game = createPlayGame();
  let pane = $state(); let showRanges = $state(false); let ranges = $state.raw(null);
  game.onExport = (data) => pane?.handedOver(data);
  const st = $derived(game.state);
  const me = $derived(st?.seat === 'oop' ? 0 : 1);
  const other = (seat) => (seat === 'oop' ? 'ip' : 'oop');
  const SEAT = { oop: 'OOP', ip: 'IP' };
  $effect(() => { if (st?.ranges) ranges = { seat: st.seat, hero: st.hero, ...st.ranges }; });
  const lastOf = (who) => st?.history[st.history.length - 1]?.actions.filter((a) => a.who === who).at(-1)?.label ?? '';
  const href = $derived(game.study ? studyUrl(game.config, game.study.flop, { line: game.study.line, dealt: game.study.dealt, hand: game.study.hero, lite: true, resolve: true }) : '');
  const listOf = (seat) => ranges[seat].map(([name, w]) => ({ name, w }));
  const num = (x) => String(Math.round(10 * Math.abs(x)) / 10);
  const session = $derived(game.session.hands ? `${game.session.net > 0 ? '+' : game.session.net < 0 ? '−' : ''}${num(game.session.net)} · ${game.session.hands}` : '');
  /** Study for the decision on screen, a turn or river handed over as solved here. */
  function study(ev) { ev?.preventDefault(); if (!game.study) return; pane.open(href, game.study.share ? { solve: game.study.share, line: game.study.streetLine } : null); }
</script>
<StudyPane bind:this={pane} class="train play" back="Play" onSwipeLeft={study} requestExport={(solve, ask) => game.worker.postMessage({ type: 'export', solve, ask })}>
  <div class="rule"></div>
  <main class="table">
    <header>
      <Logo /><span class="grow"></span><span class="session" class:down={game.session.net < 0} title="Chips won since the flop, this session">{session}</span>
      <button type="button" class="icon" aria-pressed={showRanges} aria-label="Both ranges" title="Both ranges" onclick={() => (showRanges = !showRanges)}><Icon name="ranges" /></button>
      {#if game.study}<a class="icon" id="study" {href} aria-label="Study this spot (or swipe left)" title="Study this spot" onclick={study}><Icon name="study" /></a>{/if}
    </header>
    {#if st}<Seat name="Villain" seat={other(st.seat)} cards={st.villain} behind={st.behind[1 - me]} last={lastOf('villain')} acting={!!st.actor && st.actor !== st.seat && !st.result} />{:else}<section class="seat villain"></section>{/if}
    <section class="felt" aria-label="The board and the pot">
      <div class="p-board"><Cards cards={st?.board ?? ''} slots={5} /></div>
      {#if st}<div class="pot"><span>Pot</span> {num(st.pot)}</div><Past history={st.history} who={(a) => (a.who === 'hero' ? 'You' : 'Villain')} />{/if}
    </section>
    {#if showRanges && ranges}<section class="minis ranges" aria-label="Both ranges at this decision"><RangeChart title="You {SEAT[ranges.seat]}" hands={listOf(ranges.seat)} marked={cellOf(ranges.hero)} /><RangeChart title="Villain {SEAT[other(ranges.seat)]}" hands={listOf(other(ranges.seat))} villain /></section>{/if}
    {#if st}<Seat name="You" seat={st.seat} cards={st.hero} behind={st.behind[me]} last={lastOf('hero')} acting={st.toAct} big />{:else}<section class="seat hero"></section>{/if}
    <Moves {game} />
  </main>
</StudyPane>
