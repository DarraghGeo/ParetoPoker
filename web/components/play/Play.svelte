<!-- Play: whole hands heads up against the solved villain, at a table: villain across, the board and pot between, you
     below, each on a clock. It opens on the table's set-up (who you play, which bet sizes); nothing is solved before Deal.
     Study sits beside it for the decision on screen, and the hand can be copied out as text. -->
<script>
  import { onDestroy } from 'svelte';
  import Cards from '../common/Cards.svelte';
  import CopyButton from '../common/CopyButton.svelte';
  import Icon from '../common/Icon.svelte';
  import Logo from '../common/Logo.svelte';
  import StudyPane from '../common/StudyPane.svelte';
  import Days from './Days.svelte';
  import Grade from './Grade.svelte';
  import Mistakes from './Mistakes.svelte';
  import RangePeek from './RangePeek.svelte';
  import Moves from './Moves.svelte';
  import Seat from './Seat.svelte';
  import Sitting from './Sitting.svelte';
  import Why from './Why.svelte';
  import { chips } from '../../lib/actions.js';
  import { cellOf } from '../../lib/cards.js';
  import { studyUrl } from '../../lib/links.js';
  import { route } from '../../lib/route.svelte.js';
  import { pause, sitDown, studyClosed, studyOpened } from '../../lib/play/flow.js';
  import { createPlayGame } from '../../lib/play/game.svelte.js';
  import { gradeOf } from '../../lib/play/grade.js';
  import { recordOf } from '../../lib/play/rules.js';
  import { handText, seatNames } from '../../lib/play/history.js';
  import { seatingLabel } from '../../lib/play/seating.js';
  import { endTrace, mark } from '../../lib/play/trace.js';

  const GRADE_MS = 4500;
  const game = createPlayGame();
  let pane = $state(); let studying = $state(false); let peek = $state(null); let ranges = $state.raw(null); let sitting = $state(true); let graded = $state.raw(null); let gradeTimer = null; let reviewing = $state(false); let scores = $state(false); let why = $state.raw(null);
  game.onExport = (data) => pane?.handedOver(data);
  game.onExplained = (data) => { if (why && data.ask === why.key) why = { ...why, told: data.told, failed: !data.told }; };
  // leaving Play stops its solving
  onDestroy(() => { endTrace(); clearTimeout(gradeTimer); clearTimeout(game.timer); clearInterval(game.tick); game.worker.terminate(); for (const h of game.helpers) h.worker.terminate(); });
  const st = $derived(game.state);
  const me = $derived(st?.seat === 'oop' ? 0 : 1);
  const other = (seat) => (seat === 'oop' ? 'ip' : 'oop');
  /** The setup of the hand on the table: the table's betting with this hand's own ranges, pot and stack. */
  const config = $derived(st?.spot ? { ...game.config, ...st.spot } : game.config);
  const names = $derived(seatNames(config));
  const street = $derived(st?.history.at(-1));
  // both ranges as they stand at the last decision told with them (the hand's first, then each of hero's), for a tap on a player's cards
  $effect(() => { if (st?.ranges) ranges = { id: st.id, seat: st.seat, hero: st.hero, board: st.board, ...st.ranges }; });
  const held = $derived(ranges && st && ranges.id === st.id ? ranges : null);
  const front = (who) => (street?.actions ?? []).filter((a) => a.who === who).reduce((t, a) => t + (a.add ?? 0), 0);
  const WORD = { fold: 'Fold', check: 'Check', call: 'Call', bet: 'Bet', raise: 'Raise', allin: 'All-in' };
  const lastOf = (who) => { const a = (street?.actions ?? []).filter((x) => x.who === who).at(-1); return a ? WORD[a.kind] ?? a.label : ''; };
  // how hero's last move stands against the solution: shown when he makes it, for a few seconds
  const mine = $derived((st?.history ?? []).flatMap((h) => h.actions).filter((a) => a.who === 'hero'));
  let seen = '';
  $effect(() => {
    const key = st ? `${st.id}|${mine.length}` : ''; if (key === seen) return; seen = key;
    const g = gradeOf(mine.at(-1)); clearTimeout(gradeTimer); graded = g ? { ...g, key, study: game.study, href, rule: mine.at(-1).rule ?? null } : null;   // the decision just made, for Study
    if (g && !st?.result?.stopped) gradeTimer = setTimeout(() => (graded = null), GRADE_MS);   // at an error that stopped the hand it stays, as the reason
  });
  $effect(() => { if (studying) studyOpened(game); else studyClosed(game); });
  // nothing moves while Study or a card over the table is open: clocks stop, and villain's next action waits
  $effect(() => pause(game, studying || !!peek || !!why || scores || reviewing || (sitting && game.seated)));
  // a newer build of the app may be taken up while nothing has been dealt
  $effect(() => { route.idle = !game.seated; return () => { route.idle = true; }; });
  const clockOf = (who) => (game.clock.who === who && !st?.result ? game.clock : null);
  const href = $derived(game.study ? studyUrl(config, game.study.flop, { line: game.study.line, dealt: game.study.dealt, hand: game.study.hero, lite: true, resolve: true }) : '');
  const listOf = (seat) => held[seat].map(([name, w]) => ({ name, w }));
  const peeked = $derived(peek && held ? (peek === 'hero' ? held.seat : other(held.seat)) : null);
  const signed = (x) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${chips(Math.abs(x))}`;
  /** EV given up: always a loss, so shown with its minus and to the cent (a good decision costs nothing). */
  const ev = (x) => `EV ${x >= 0.005 ? '−' : ''}${x.toFixed(2)}`;
  /** The session in a line: what a hand gives up on average (a total would only ever grow), and how many were played. */
  const perHand = $derived(game.session.hands ? game.session.lost / game.session.hands : 0);
  const session = $derived(game.session.hands ? `${ev(perHand)} a hand · ${game.session.hands} ${game.session.hands === 1 ? 'hand' : 'hands'}` : game.days.length ? 'Scores' : '');
  /** Study for the decision on screen, its street handed over as solved here. */
  function study(ev) { ev?.preventDefault(); if (!game.study) return; pane.open(href, game.study.share ? { solve: game.study.share, line: game.study.streetLine } : null); }
  /** Why, for the move just graded: a drawer with the hand's explanation, worked out from the solve the table holds. */
  function explainGraded() {
    const g = graded; clearTimeout(gradeTimer); graded = null; if (!g?.study) return;
    why = { ...g, hero: g.study.hero, told: null, failed: false };
    mark('working out an explanation');
    if (g.level !== 'off') game.worker.postMessage({ type: 'explain', ask: g.key, solve: g.study.share, at: g.study.at, cards: g.study.cards });
  }
  /** On from the drawer to Study for the same decision, its street handed over as solved here. */
  function studyWhy() { const g = why; why = null; pane.open(g.href, g.study.share ? { solve: g.study.share, line: g.study.streetLine } : null); }
  function deal(seating) { ranges = null; peek = null; why = null; graded = null; sitting = false; sitDown(game, seating); }
</script>
<StudyPane bind:this={pane} bind:studying class="play" back="Play" onSwipeLeft={study} requestExport={(solve, ask) => game.worker.postMessage({ type: 'export', solve, ask })}>
  <div class="rule"></div>
  <main class="table">
    <header>
      <Logo />{#if game.seated}<span class="pool">{st && names.tag ? names.tag : seatingLabel(game.seating)}</span><button type="button" class="session" class:down={perHand >= 0.005} aria-label="The last ten days" onclick={() => (scores = true)} title="What your decisions give up against the solver's play, in chips a hand, on average this session. In all: {game.session.lost.toFixed(2)}. Chips won since the flop: {signed(game.session.net)}">{session}</button>{/if}<span class="grow"></span>
      {#if game.mistakes.length || Object.keys(game.rules.stats).length || reviewing}<button type="button" class="icon" aria-pressed={reviewing} aria-label="Mistakes and rules" title="Mistakes and rules" onclick={() => (reviewing = !reviewing)}><Icon name="flag" /></button>{/if}
      {#if game.seated}
        <button type="button" class="icon" aria-pressed={sitting} aria-label="Set up the table" title="Set up the table" onclick={() => { sitting = !sitting; reviewing = false; }}><Icon name="seats" /></button>
        {#if !sitting && !reviewing}
          {#if st}<CopyButton text={() => handText(st, config)} label="Copy the hand history" />{/if}
          {#if game.study}<a class="icon" id="study" {href} aria-label="Study this spot (or swipe left)" title="Study this spot" onclick={study}><Icon name="study" /></a>{/if}{/if}
      {/if}
    </header>
    {#if why}<Why hero={why.hero} grade={why} told={why.told} failed={why.failed} rule={why.rule} record={why.rule ? recordOf(game.rules, why.rule.id) : null} onstudy={studyWhy} onclose={() => (why = null)} />{/if}
    {#if scores}<Days days={game.days} onclose={() => (scores = false)} />{/if}
    {#if reviewing}<Mistakes hands={game.mistakes} rules={game.rules} onstudy={(m) => pane.open(m.href, m.spot ? { street: m.spot } : m.flop ? { flop: m.flop } : null)} onclose={() => (reviewing = false)} />
    {:else if sitting}<Sitting stopped={game.seated ? null : game.stopped} seating={game.seating} playing={game.seated} ondeal={deal} oncancel={() => (sitting = false)} />
    {:else}
      {#if st && names.line}<p class="pre" aria-label="Before the flop"><b>{names.pot}</b> {names.line}</p>{/if}
      <div class="arena">
        <div class="felt" aria-hidden="true"></div>
        <Seat name="Villain" tag={names[st ? other(st.seat) : 'oop']} cards={st?.villain ?? null} behind={st ? st.behind[1 - me] : config.stack} clock={clockOf('villain')} bank={game.bank.villain} dealer={st ? st.seat === 'oop' : false} onpeek={() => (peek = 'villain')} />
        <div class="middle" aria-label="The board and the pot">
          <div class="wager" class:on={!!lastOf('villain')}>{#if lastOf('villain')}<b>{lastOf('villain')}</b>{#if front('villain') > 0}<span>{chips(front('villain'))}</span>{/if}{/if}</div>
          <div class="pot"><span>Pot</span> {st ? chips(st.pot) : chips(config.pot)}</div>
          <div class="p-board"><Cards cards={st?.board ?? ''} slots={5} /></div>
          <div class="outcome" class:down={st?.result?.net < 0 || st?.result?.stopped}>{#if st?.result}{#if st.result.stopped}<b>Error</b> the hand stops here{:else}<b>{signed(st.result.net)}</b> {st.result.how}{/if}{#if st.result.lost != null}{' · '}{ev(st.result.lost)}{/if}{#if st.result.mine}<span>{st.result.mine} against {st.result.his}</span>{/if}{:else if game.timedOut}<span>Out of time</span>{/if}</div>
          <div class="wager" class:on={!!lastOf('hero')}>{#if lastOf('hero')}<b>{lastOf('hero')}</b>{#if front('hero') > 0}<span>{chips(front('hero'))}</span>{/if}{/if}</div>
          <div class="grades" class:over={!!st?.result}>{#if graded}{#key graded.key}<Grade grade={graded} onopen={explainGraded} />{/key}{/if}</div>
        </div>
        <Seat name="You" tag={names[st?.seat ?? 'ip']} cards={st?.hero ?? null} behind={st ? st.behind[me] : config.stack} clock={clockOf('hero')} bank={game.bank.hero} dealer={st ? st.seat === 'ip' : true} hero onpeek={() => (peek = 'hero')} />
        {#if peeked}<RangePeek title="{peek === 'hero' ? 'You' : 'Villain'} {names[peeked]}" against="{peek === 'hero' ? 'Villain' : 'You'} {names[other(peeked)]}" mine={listOf(peeked)} his={listOf(other(peeked))} board={held.board} marked={peek === 'hero' ? cellOf(held.hero) : null} villain={peek === 'villain'} onclose={() => (peek = null)} />{/if}
      </div>
      <Moves {game} {config} />
    {/if}
  </main>
</StudyPane>
