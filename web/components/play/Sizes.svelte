<!-- The bet sizes Play is solved with, a list for each street in % of the pot: three ready sets, or typed. Fewer sizes
     solve faster. `onchange(bets)` takes the three lists as fractions of the pot. -->
<script>
  import { betLists } from '../../lib/setup.js';
  let { config, onchange } = $props();
  const SETS = [['Fast', [[0.33], [0.33], [0.75]]], ['Standard', [[0.33, 0.75], [0.33, 0.75], [0.75]]], ['Full', [[0.33, 0.75, 1.5], [0.33, 0.75, 1.5], [0.33, 0.75, 1.5]]]];
  const STREETS = ['Flop', 'Turn', 'River'];
  const text = (list) => list.map((b) => Math.round(100 * b)).join(' ');
  /** The setup's sizes as three lists: one list plays every street, and a missing later street takes the last. */
  const three = (c) => { const lists = betLists(c); return [0, 1, 2].map((k) => lists[Math.min(k, lists.length - 1)]); };
  const now = $derived(three(config));
  let typed = $state(null);
  const shown = $derived(typed ?? now.map(text));
  const same = (a, b) => JSON.stringify(a.map((l) => l.map((x) => Math.round(100 * x)))) === JSON.stringify(b.map((l) => l.map((x) => Math.round(100 * x))));
  const read = (t) => t.split(/[\s,]+/).map(Number).filter((x) => x > 0 && x <= 500).map((x) => x / 100);
  function take(lists) { typed = null; if (!same(lists, now)) onchange(lists); }
  /** Sizes are taken as they are typed, while every list reads as one: a phone may close the sheet without saying the
   *  field was left. What is typed stays as typed until then. */
  function entered() { const lists = typed.map(read); if (lists.every((l) => l.length) && !same(lists, now)) onchange(lists); }
  function commit() { if (!typed) return; const lists = typed.map(read); if (lists.every((l) => l.length)) take(lists); else typed = null; }
</script>
<div class="line"><span>Sizes</span><div class="seg" role="group" aria-label="Bet sizes">{#each SETS as [name, lists]}<button type="button" aria-pressed={same(lists, now)} onclick={() => take(lists)}>{name}</button>{/each}</div></div>
<div class="sizes">{#each STREETS as street, k}<label>{street}<input inputmode="numeric" autocomplete="off" value={shown[k]} oninput={(ev) => { typed = shown.map((x, i) => (i === k ? ev.currentTarget.value : x)); entered(); }} onchange={commit} onblur={commit} aria-label="{street} bet sizes, percent of the pot"></label>{/each}</div>
<p class="said">Bet sizes in % of the pot, a list for each street. Fewer sizes solve faster: Fast is one size a street.</p>
