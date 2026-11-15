<!-- The setup drawer: the board, the ranges, the pot, stack and betting, solved on Solve (lite, and the button says so,
     where the spot is too big to solve whole). From a street's first decision, only the betting, to re-solve that street. -->
<script>
  import Drawer from '../common/Drawer.svelte';
  import Painter from './Painter.svelte';
  import Presets from './Presets.svelte';
  import { opensStreet } from '../../lib/study/line.js';
  import { cellsOf } from '../../lib/study/paint.js';
  import { presetOf } from '../../lib/study/presets.js';
  import { checkFit, closePanel, openSetup, submitSetup, takePreset } from '../../lib/study/setup.js';
  let { game } = $props();
  const shown = $derived(game.panel === 'setup' || game.panel === 'sub');
  const here = $derived(game.nodes?.[game.node]);
  const error = $derived(game.setupError || (cellsOf(game.draft[game.draft.side]) ? '' : 'That range cannot be read.'));
  $effect(() => { if (game.panel === 'setup') { JSON.stringify(game.form); JSON.stringify(game.draft); checkFit(game); } });
  const submit = (ev) => { ev.preventDefault(); submitSetup(game); };
</script>
<Drawer bind:open={() => shown, (open) => { if (!open) closePanel(game); }} label="Setup" class={game.panel === 'sub' ? 'sub' : ''}>{#if game.form}<form onsubmit={submit}>
  <div class="spot-only">
    {#if here && opensStreet(game.nodes, here)}<button type="button" class="link" onclick={() => openSetup(game, true)}>Re-solve from this street</button>{/if}
    <label>Board<input autocomplete="off" spellcheck="false" bind:value={game.form.board}></label>
    <div class="presets" aria-label="Ranges by position and preflop action"><Presets sel={presetOf(game.draft.oop.trim(), game.draft.ip.trim())} onchoose={(part, value) => takePreset(game, part, value)} /></div>
    <Painter {game} />
  </div>
  <div class="row"><label>Pot<input inputmode="decimal" bind:value={game.form.pot}></label><label>Behind<input inputmode="decimal" bind:value={game.form.stack}></label></div>
  <div class="row"><label>Bets %<input autocomplete="off" bind:value={game.form.bets}></label><label>Raises x<input autocomplete="off" bind:value={game.form.raise}></label></div>
  <div class="row"><label>Raises allowed<input inputmode="numeric" bind:value={game.form.max}></label><label class="check">All-in<input type="checkbox" bind:checked={game.form.allIn}></label></div>
  <p class="error" role="alert">{error}</p>
  <p class="error fit">{game.fit.note}</p>
  <button type="submit" class="primary" class:lite={game.fit.lite}>{game.fit.lite ? 'Solve (Lite)' : 'Solve'}</button>
</form>{/if}</Drawer>
