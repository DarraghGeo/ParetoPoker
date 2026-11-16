<!-- Play: whole hands heads up against the solved villain, at a table: villain across, the board and pot between, you
     below, each on a clock. Study sits beside it for the decision on screen, and the hand can be copied out as text. -->
<script>
  import Cards from '../common/Cards.svelte';
  import CopyButton from '../common/CopyButton.svelte';
  import Icon from '../common/Icon.svelte';
  import Logo from '../common/Logo.svelte';
  import Popover from '../common/Popover.svelte';
  import RangeChart from '../common/RangeChart.svelte';
  import StudyPane from '../common/StudyPane.svelte';
  import Presets from '../study/Presets.svelte';
  import Moves from './Moves.svelte';
  import Seat from './Seat.svelte';
  import { chips } from '../../lib/actions.js';
  import { cellOf } from '../../lib/cards.js';
  import { studyUrl } from '../../lib/links.js';
  import { resetup } from '../../lib/play/flow.js';
  import { createPlayGame } from '../../lib/play/game.svelte.js';
  import { handText, seatNames } from '../../lib/play/history.js';
  import { SETUP_KEY } from '../../lib/setup.js';
  import { keep, load } from '../../lib/storage.js';
  import { presetAfter, presetOf } from '../../lib/study/presets.js';

  const game = createPlayGame();
  let pane = $state(); let showRanges = $state(false); let ranges = $state.raw(null); let picking = $state(false); let anchor = $state();
  game.onExport = (data) => pane?.handedOver(data);
  const st = $derived(game.state);
  const me = $derived(st?.seat === 'oop' ? 0 : 1);
  const other = (seat) => (seat === 'oop' ? 'ip' : 'oop');
  const names = $derived(seatNames(game.config));
  const sel = $derived(presetOf(String(game.config.oop).trim(), String(game.config.ip).trim()));
  /** Who the table is against: live player types, or online ranges by position. */
  const pool = $derived(sel?.action === 'Live' ? 'live' : 'online');
  const street = $derived(st?.history.at(-1));
  $effect(() => { if (st?.ranges) ranges = { seat: st.seat, hero: st.hero, ...st.ranges }; });
  const front = (who) => (street?.actions ?? []).filter((a) => a.who === who).reduce((t, a) => t + (a.add ?? 0), 0);
  const WORD = { fold: 'Fold', check: 'Check', call: 'Call', bet: 'Bet', raise: 'Raise', allin: 'All-in' };
  const lastOf = (who) => { const a = (street?.actions ?? []).filter((x) => x.who === who).at(-1); return a ? WORD[a.kind] ?? a.label : ''; };
  const clockOf = (who) => (game.clock.who === who && !st?.result ? game.clock : null);
  const href = $derived(game.study ? studyUrl(game.config, game.study.flop, { line: game.study.line, dealt: game.study.dealt, hand: game.study.hero, lite: true, resolve: true }) : '');
  const listOf = (seat) => ranges[seat].map(([name, w]) => ({ name, w }));
  const signed = (x) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${chips(Math.abs(x))}`;
  const session = $derived(game.session.hands ? `${signed(game.session.net)} · ${game.session.hands} ${game.session.hands === 1 ? 'hand' : 'hands'}` : '');
  /** Study for the decision on screen, a turn or river handed over as solved here. */
  function study(ev) { ev?.preventDefault(); if (!game.study) return; pane.open(href, game.study.share ? { solve: game.study.share, line: game.study.streetLine } : null); }
  /** Other ranges by preflop action and seat (or player type): kept as the setup, and the table dealt again. */
  function seats(part, value) {
    const p = presetAfter(game.config.oop, game.config.ip, part, value); const config = { ...game.config, oop: p.ranges.oop, ip: p.ranges.ip, pot: p.pot, stack: p.stack };
    keep(SETUP_KEY, { ...(load(SETUP_KEY) ?? {}), config }); ranges = null; resetup(game, config);
  }
</script>
<StudyPane bind:this={pane} class="play" back="Play" onSwipeLeft={study} requestExport={(solve, ask) => game.worker.postMessage({ type: 'export', solve, ask })}>
  <div class="rule"></div>
  <main class="table">
    <header>
      <Logo /><span class="pool">{sel ? (pool === 'live' ? 'Live' : 'Online') : 'Own ranges'}</span><span class="session" class:down={game.session.net < 0} title="Chips won since the flop, this session">{session}</span><span class="grow"></span>
      <button bind:this={anchor} type="button" class="icon" aria-label="Who is at the table" title="Seats and player types" onclick={() => (picking = !picking)}><Icon name="seats" /></button>
      <button type="button" class="icon" aria-pressed={showRanges} aria-label="Both ranges" title="Both ranges" onclick={() => (showRanges = !showRanges)}><Icon name="ranges" /></button>
      {#if st}<CopyButton text={() => handText(st, game.config)} label="Copy the hand history" />{/if}
      {#if game.study}<a class="icon" id="study" {href} aria-label="Study this spot (or swipe left)" title="Study this spot" onclick={study}><Icon name="study" /></a>{/if}
    </header>
    <Popover bind:open={picking} {anchor} align="right" class="seatpick" label="Ranges by preflop action and seat"><div class="presets">
      <div class="line"><span>Against</span><div class="seg" role="group" aria-label="Live or online players"><button type="button" aria-pressed={pool === 'live'} onclick={() => { if (pool !== 'live') seats('action', 'Live'); }}>Live</button><button type="button" aria-pressed={pool === 'online'} onclick={() => { if (pool !== 'online') seats('action', 'SRP'); }}>Online</button></div></div>
      <Presets {sel} {pool} onchoose={seats} /></div></Popover>
    <div class="arena">
      <div class="felt" aria-hidden="true"></div>
      <Seat name="Villain" tag={names[st ? other(st.seat) : 'oop']} cards={st?.villain ?? null} behind={st ? st.behind[1 - me] : game.config.stack} clock={clockOf('villain')} bank={game.bank.villain} dealer={st ? st.seat === 'oop' : false} />
      <div class="middle" aria-label="The board and the pot">
        <div class="wager" class:on={!!lastOf('villain')}>{#if lastOf('villain')}<b>{lastOf('villain')}</b>{#if front('villain') > 0}<span>{chips(front('villain'))}</span>{/if}{/if}</div>
        <div class="pot"><span>Pot</span> {st ? chips(st.pot) : chips(game.config.pot)}</div>
        <div class="p-board"><Cards cards={st?.board ?? ''} slots={5} /></div>
        <div class="outcome" class:down={st?.result?.net < 0}>{#if st?.result}<b>{signed(st.result.net)}</b> {st.result.how}{#if st.result.mine}<span>{st.result.mine} against {st.result.his}</span>{/if}{:else if game.timedOut}<span>Out of time</span>{/if}</div>
        <div class="wager" class:on={!!lastOf('hero')}>{#if lastOf('hero')}<b>{lastOf('hero')}</b>{#if front('hero') > 0}<span>{chips(front('hero'))}</span>{/if}{/if}</div>
      </div>
      <Seat name="You" tag={names[st?.seat ?? 'ip']} cards={st?.hero ?? null} behind={st ? st.behind[me] : game.config.stack} clock={clockOf('hero')} bank={game.bank.hero} dealer={st ? st.seat === 'ip' : true} hero />
    </div>
    {#if showRanges && ranges}<section class="minis ranges" aria-label="Both ranges at this decision"><RangeChart title="You {names[ranges.seat]}" hands={listOf(ranges.seat)} marked={cellOf(ranges.hero)} /><RangeChart title="Villain {names[other(ranges.seat)]}" hands={listOf(other(ranges.seat))} villain /></section>{/if}
    <Moves {game} onstudy={study} />
  </main>
</StudyPane>
