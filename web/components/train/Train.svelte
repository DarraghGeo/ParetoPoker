<!-- Train: the drills to choose from, then the one taken up: its questions, on the ranges or on boards dealt at random,
     with Study beside it for the spot on screen. -->
<script>
  import Cards from '../common/Cards.svelte';
  import Drawer from '../common/Drawer.svelte';
  import Icon from '../common/Icon.svelte';
  import Logo from '../common/Logo.svelte';
  import Past from '../common/Past.svelte';
  import StudyPane from '../common/StudyPane.svelte';
  import Ask from './Ask.svelte';
  import Drills from './Drills.svelte';
  import History from './History.svelte';
  import Ranges from './Ranges.svelte';
  import Settings from './Settings.svelte';
  import Where from './Where.svelte';
  import { dealtSpotUrl } from '../../lib/links.js';
  import { createTrainGame } from '../../lib/train/game.svelte.js';
  import { nextView, startDrill } from '../../lib/train/answer.js';
  import { todayOf } from '../../lib/train/prefs.js';
  import { spotText } from '../../lib/train/spotText.js';

  const game = createTrainGame();
  let pane = $state(); let settings = $state(false); let history = $state(false); let studying = $state(false); let drill = $state(null);
  function pick(chosen) { drill = chosen; startDrill(game, chosen); }
  game.onExport = (data) => pane?.handedOver(data);
  const d = $derived(game.spot?.decision ?? null);
  const t = $derived(todayOf(game.prefs));
  const hrefOf = (at, hand) => dealtSpotUrl(game.config, at, hand);
  const here = $derived(d ? hrefOf({ board: d.boardText, history: d.history, line: d.line }, game.q?.hand) : '');
  /** Study for the spot on screen, its turn or river handed over as solved here. */
  function study(ev) { ev?.preventDefault(); if (!d) return; pane.open(here, d.solve != null ? { solve: d.solve, line: d.line } : null); }
  function studyPast(ev, href) { ev.preventDefault(); history = false; pane.open(href); }
</script>
<StudyPane bind:this={pane} bind:studying class="train" back="Train" busy={() => settings || history} onSwipeLeft={study} requestExport={(solve, ask) => game.worker.postMessage({ type: 'export', solve, ask })}>
  <div class="rule">{#if t.n}<i style="flex:{t.ok};background:var(--ok)"></i><i style="flex:{t.n - t.ok};background:var(--danger)"></i>{/if}</div>
  <main>
    <header>
      <Logo />{#if drill}<button type="button" class="icon" aria-label="All drills" onclick={() => (drill = null)}><Icon name="back" /></button>{/if}<div class="board">{#if drill && d}<Cards cards={d.boardText} />{:else if !drill}<span class="title">Train</span>{/if}</div><span class="grow"></span>
      <button type="button" class="score" aria-label="Today's score. Opens the last questions." onclick={() => (history = true)}><b>{t.ok}</b>/{t.n}</button>
      <button type="button" class="icon" aria-label="Settings" onclick={() => (settings = true)}><Icon name="settings" /></button>
    </header>
    {#if !drill}<Drills prefs={game.prefs} onpick={pick} />{:else}
    <section class="t-stage">
      <div class="left">
        {#if d}<Past history={d.history} who={(a) => (a.seat === d.seat ? 'Hero' : 'Villain')} /><Where decision={d} studyHref={here} onStudy={study} copy={() => spotText(game.spot, game.q, game.config)} view={game.prefs.view} onView={() => nextView(game)} />{/if}
        <Ranges spot={game.spot} view={game.prefs.view} hand={game.q?.hand ?? null} show={game.q?.show ?? null} done={!!game.q?.done} />
      </div>
      <Ask {game} blocked={() => settings || history || studying} />
    </section>{/if}
  </main>
</StudyPane>
<Drawer bind:open={settings} label="Settings"><Settings {game} /></Drawer>
<Drawer bind:open={history} label="Last questions"><History {game} hrefOf={(e) => hrefOf(e, e.hand)} onStudy={studyPast} /></Drawer>
