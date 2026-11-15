<!-- Off the top bar: the ranges by preflop action and position, taken at once and solved a moment after the last tap. -->
<script>
  import Icon from '../common/Icon.svelte';
  import Popover from '../common/Popover.svelte';
  import Presets from './Presets.svelte';
  import { presetOf } from '../../lib/study/presets.js';
  import { takeSeats } from '../../lib/study/setup.js';
  let { game } = $props();
  let open = $state(false); let anchor = $state();
</script>
<button bind:this={anchor} type="button" class="icon" aria-label="Ranges by position and preflop action" title="Positions" onclick={() => (open = !open)}><Icon name="seats" /></button>
<Popover bind:open {anchor} align="right" class="seatpick" label="Ranges by position and preflop action">
  <div class="presets"><Presets sel={presetOf(game.config.oop, game.config.ip)} onchoose={(part, value) => takeSeats(game, part, value)} /></div>
</Popover>
