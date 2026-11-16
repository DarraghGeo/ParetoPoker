<!-- The last ten days played: for each, the EV given up a hand on average (as a bar and a number), the hands played and
     the chips won. A tap outside closes it. -->
<script>
  import { chips } from '../../lib/actions.js';
  import { dayKey } from '../../lib/days.js';
  let { days, onclose } = $props();
  const name = (key) => { if (key === dayKey()) return 'Today'; const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }); };
  const rows = $derived(days.map((d) => ({ ...d, each: d.hands ? (d.lost ?? 0) / d.hands : 0 })));
  const most = $derived(Math.max(0.01, ...rows.map((r) => r.each)));
  const all = $derived.by(() => { const hands = rows.reduce((t, r) => t + r.hands, 0); return { hands, each: hands ? rows.reduce((t, r) => t + (r.lost ?? 0), 0) / hands : 0 }; });
  const signed = (x) => `${x > 0 ? '+' : x < 0 ? '−' : ''}${chips(Math.abs(x))}`;
  const ev = (x) => `${x >= 0.005 ? '−' : ''}${x.toFixed(2)}`;
</script>
<button type="button" class="peek-out" aria-label="Close" onclick={onclose}></button>
<section class="peek scores" aria-label="The last ten days">
  <h2>EV a hand</h2>
  {#if !rows.length}<p class="said">Nothing yet. Each day you play is kept here, the last ten.</p>
  {:else}
    <table>
      <thead><tr><th>Day</th><th class="dbar" aria-hidden="true"></th><th>EV</th><th>Hands</th><th>Won</th></tr></thead>
      <tbody>{#each rows as r (r.day)}<tr>
        <th>{name(r.day)}</th><td class="dbar"><i style="width:{(100 * r.each / most).toFixed(1)}%"></i></td>
        <td class="ev">{ev(r.each)}</td><td>{r.hands}</td><td class:down={r.net < 0}>{signed(r.net)}</td>
      </tr>{/each}</tbody>
      {#if rows.length > 1}<tfoot><tr><th>All</th><td class="dbar"></td><td class="ev">{ev(all.each)}</td><td>{all.hands}</td><td></td></tr></tfoot>{/if}
    </table>
    <p class="said">What your decisions give up against the solver, in chips a hand: a shorter bar is better. Won is chips from the flop on, which is mostly the cards.</p>
  {/if}
</section>
