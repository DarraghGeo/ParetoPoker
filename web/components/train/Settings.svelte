<!-- Settings: the kinds of question in their three groups and the streets, each with its last five days. -->
<script>
  import Choice from './Choice.svelte';
  import { STREETS, TYPES, TYPE_GROUPS, lastDays } from '../../lib/train/prefs.js';
  import { setChoice } from '../../lib/train/answer.js';
  let { game } = $props();
  const groups = [...TYPE_GROUPS.map(([title, keys]) => [title, 'types', Object.fromEntries(keys.map((key) => [key, TYPES[key]]))]), ['Streets', 'streets', STREETS]];
</script>
{#each groups as [title, group, names]}
  <h3>{title}</h3>
  {#each Object.entries(names) as [key, name]}<Choice {name} on={game.prefs[group][key]} days={lastDays(game.prefs, key)} ontoggle={() => setChoice(game, group, key)} />{/each}
{/each}
<p class="note">Questions on the ranges use the preset ranges by position and need no solve, so they also fill the wait for one. The rest are asked on spots dealt at random with the ranges, pot and bet sizes set up in <a href="study.html">Study</a>. Every spot starts from a flop, solved lite, which takes up to a minute. A turn or river is that flop played down a line its solution takes, then solved again for the ranges that arrive.</p>
