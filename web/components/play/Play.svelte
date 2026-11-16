<!-- Play: whole hands heads up against the solved villain, at a table: villain across, the board and pot between, you
     below, each on a clock. It opens on the table's set-up (who you play, which bet sizes); nothing is solved before Deal.
     Study sits beside it for the decision on screen, and the hand can be copied out as text. -->
<script>
  import { onDestroy } from 'svelte';
  import Cards from '../common/Cards.svelte';
  import CopyButton from '../common/CopyButton.svelte';
  import Icon from '../common/Icon.svelte';
  import Logo from '../common/Logo.svelte';
  import RangeChart from '../common/RangeChart.svelte';
  import StudyPane from '../common/StudyPane.svelte';
  import Grade from './Grade.svelte';
  import Moves from './Moves.svelte';
  import Seat from './Seat.svelte';
  import Sitting from './Sitting.svelte';
  import { chips } from '../../lib/actions.js';
  import { cellOf } from '../../lib/cards.js';
  import { studyUrl } from '../../lib/links.js';
  import { route } from '../../lib/route.svelte.js';
  import { sitDown } from '../../lib/play/flow.js';
  import { createPlayGame } from '../../lib/play/game.svelte.js';
  import { gradeOf } from '../../lib/play/grade.js';
  import { handText, seatNames } from '../../lib/play/history.js';
  import { seatingLabel } from '../../lib/play/seating.js';

  const GRADE_MS = 4500;
  const game = createPlayGame();
  let pane = $state(); let showRanges = $state(false); let ranges = $state.raw(null); let sitting = $state(true); let graded = $state.raw(null); let gradeTimer = null;
  game.onExport = (data) => pane?.handedOver(data);
  // leaving Play stops its solving
  onDestroy(() => { clearTimeout(gradeTimer); clearTimeout(game.timer); clearInterval(game.tick); game.worker.terminate(); for (const h of game.helpers) h.worker.terminate(); });
  const st = $derived(game.state);
  const me = $derived(st?.seat === 'oop' ? 0 : 1);
  const other = (seat) => (seat === 'oop' ? 'ip' : 'oop');
  /** The setup of the hand on the table: the table's betting with this hand's own ranges, pot and stack. */
  const config = $derived(st?.spot ? { ...game.config, ...st.spot } : game.config);
  const names = $derived(seatNames(config));
  const street = $derived(st?.history.at(-1));
  $effect(() => { if (st?.ranges) ranges = { seat: st.seat, hero: st.hero, ...st.ranges }; });
  const front = (who) => (street?.actions ?? []).filter((a) => a.who === who).reduce((t, a) => t + (a.add ?? 0), 0);
  const WORD = { fold: 'Fold', check: 'Check', call: 'Call', bet: 'Bet', raise: 'Raise', allin: 'All-in' };
  const lastOf = (who) => { const a = (street?.actions ?? []).filter((x) => x.who === who).at(-1); return a ? WORD[a.kind] ?? a.label : ''; };
  // how hero's last move stands against the solution: shown when he makes it, for a few seconds
  const mine = $derived((st?.history ?? []).flatMap((h) => h.actions).filter((a) => a.who === 'hero'));
  let seen = '';
  $effect(() => {
    const key = st ? `${st.id}|${mine.length}` : ''; if (key === seen) return; seen = key;
    const g = gradeOf(mine.at(-1)); clearTimeout(gradeTimer); graded = g ? { ...g, key } : null;
    if (g) gradeTimer = setTimeout(() => (graded = null), GRADE_MS);
  });
  // a newer build of the app may be taken up while nothing has been dealt
  $effect(() => { route.idle = !game.seated; return () => { route.idle = true; }; });
  const clockOf = (who) => (game.clock.who === who && !st?.result ? game.clock : null);
  const href = $derived(game.study ? studyUrl(config, game.study.flop, { line: game.study.line, dealt: game.study.dealt, hand: game.study.hero, lite: true, resolve: true }) : '');
  const listOf = (seat) => ranges[seat].map(([name, w]) => ({ name, w }));
  const signed = (x) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${chips(Math.abs(x))}`;
  const session = $derived(game.session.hands ? `${signed(game.session.net)} · ${game.session.hands} ${game.session.hands === 1 ? 'hand' : 'hands'}` : '');
  /** Study for the decision on screen, its street handed over as solved here. */
  function study(ev) { ev?.preventDefault(); if (!game.study) return; pane.open(href, game.study.share ? { solve: game.study.share, line: game.study.streetLine } : null); }
  function deal(seating) { ranges = null; graded = null; sitting = false; sitDown(game, seating); }
</script>
<StudyPane bind:this={pane} class="play" back="Play" onSwipeLeft={study} requestExport={(solve, ask) => game.worker.postMessage({ type: 'export', solve, ask })}>
  <div class="rule"></div>
  <main class="table">
    <header>
      <Logo />{#if game.seated}<span class="pool">{seatingLabel(game.seating)}</span><span class="session" class:down={game.session.net < 0} title="Chips won since the flop, this session">{session}</span>{/if}<span class="grow"></span>
      {#if game.seated}
        <button type="button" class="icon" aria-pressed={sitting} aria-label="Set up the table" title="Set up the table" onclick={() => (sitting = !sitting)}><Icon name="seats" /></button>
        {#if !sitting}<button type="button" class="icon" aria-pressed={showRanges} aria-label="Both ranges" title="Both ranges" onclick={() => (showRanges = !showRanges)}><Icon name="ranges" /></button>
          {#if st}<CopyButton text={() => handText(st, config)} label="Copy the hand history" />{/if}
          {#if game.study}<a class="icon" id="study" {href} aria-label="Study this spot (or swipe left)" title="Study this spot" onclick={study}><Icon name="study" /></a>{/if}{/if}
      {/if}
    </header>
    {#if sitting}<Sitting seating={game.seating} playing={game.seated} ondeal={deal} oncancel={() => (sitting = false)} />
    {:else}
      <div class="arena">
        <div class="felt" aria-hidden="true"></div>
        <Seat name="Villain" tag={names[st ? other(st.seat) : 'oop']} cards={st?.villain ?? null} behind={st ? st.behind[1 - me] : config.stack} clock={clockOf('villain')} bank={game.bank.villain} dealer={st ? st.seat === 'oop' : false} />
        <div class="middle" aria-label="The board and the pot">
          <div class="wager" class:on={!!lastOf('villain')}>{#if lastOf('villain')}<b>{lastOf('villain')}</b>{#if front('villain') > 0}<span>{chips(front('villain'))}</span>{/if}{/if}</div>
          <div class="pot"><span>Pot</span> {st ? chips(st.pot) : chips(config.pot)}</div>
          <div class="p-board"><Cards cards={st?.board ?? ''} slots={5} /></div>
          <div class="outcome" class:down={st?.result?.net < 0}>{#if st?.result}<b>{signed(st.result.net)}</b> {st.result.how}{#if st.result.mine}<span>{st.result.mine} against {st.result.his}</span>{/if}{:else if game.timedOut}<span>Out of time</span>{/if}</div>
          <div class="wager" class:on={!!lastOf('hero')}>{#if lastOf('hero')}<b>{lastOf('hero')}</b>{#if front('hero') > 0}<span>{chips(front('hero'))}</span>{/if}{/if}</div>
          <div class="grades">{#if graded}{#key graded.key}<Grade grade={graded} onclose={() => (graded = null)} />{/key}{/if}</div>
        </div>
        <Seat name="You" tag={names[st?.seat ?? 'ip']} cards={st?.hero ?? null} behind={st ? st.behind[me] : config.stack} clock={clockOf('hero')} bank={game.bank.hero} dealer={st ? st.seat === 'ip' : true} hero />
      </div>
      {#if showRanges && ranges}<section class="minis ranges" aria-label="Both ranges at this decision"><RangeChart title="You {names[ranges.seat]}" hands={listOf(ranges.seat)} marked={cellOf(ranges.hero)} /><RangeChart title="Villain {names[other(ranges.seat)]}" hands={listOf(other(ranges.seat))} villain /></section>{/if}
      <Moves {game} {config} onstudy={study} />
    {/if}
  </main>
</StudyPane>
