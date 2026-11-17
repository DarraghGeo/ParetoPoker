<!-- What to go back to: the hands hero made a mistake in, the last ten (each with its cards, every mistake against what
     the solver does and what it cost, and the way to Study or to the hand as text); and his rules on trial, each with how
     often it has agreed with the solver and the decisions where it did not, to copy out for refining it. -->
<script>
  import Cards from '../common/Cards.svelte';
  import CopyButton from '../common/CopyButton.svelte';
  import { COSTLY, KEPT, SMALL } from '../../lib/play/mistakes.js';
  import { quizList } from '../../lib/play/quiz.js';
  import { ruleList, ruleText } from '../../lib/play/rules.js';
  let { hands, rules, quiz, onstudy, onclose } = $props();
  const asked = $derived(quizList(quiz));
  let tab = $state('mistakes'); let open = $state(null);
  const day = (at) => new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const list = $derived(ruleList(rules));
</script>
<section class="sitting mistakes" aria-label="Mistakes and rules">
  <div class="seg" role="group" aria-label="What to show"><button type="button" aria-pressed={tab === 'mistakes'} onclick={() => (tab = 'mistakes')}>Mistakes</button><button type="button" aria-pressed={tab === 'rules'} onclick={() => (tab = 'rules')}>Rules</button><button type="button" aria-pressed={tab === 'sprint'} onclick={() => (tab = 'sprint')}>Sprint</button></div>
  {#if tab === 'mistakes'}
    {#if !hands.length}<p class="said">Nothing here yet. A hand is kept when you make a move the solver almost never makes and it costs {SMALL} or more in EV, or any move that gives up {COSTLY} or more. The last {KEPT} are kept on this device.</p>
    {:else}<ul>{#each hands as h (h.at)}
      <li>
        <div class="top"><span class="hole"><Cards cards={h.hero} /></span><span class="brd"><Cards cards={h.board} /></span><span class="grow"></span><span class="when">{day(h.at)}</span><CopyButton text={() => h.text} label="Copy the hand history" /></div>
        {#each h.mistakes as m}<button type="button" class="miss" onclick={() => onstudy(m)}><i aria-hidden="true"></i><span><b>{m.street}: you {m.move}</b> {m.solver}{#if m.cost >= 0.005}{' · '}EV −{m.cost.toFixed(2)}{/if}</span><span class="go" aria-hidden="true">›</span></button>{/each}
      </li>{/each}</ul>
      <p class="said">Tap a mistake to open that decision in Study, solved again there: a turn or river in seconds, a flop in about a minute.</p>{/if}
  {:else if tab === 'sprint'}
    {#if !asked.length}<p class="said">Nothing here yet. Every eight to twelve hands a sprint asks three to five questions about the spot in front of you, before you act. Next one in {Math.max(0, quiz.left)} {quiz.left === 1 ? 'hand' : 'hands'}.</p>
    {:else}<ul>{#each asked as a (a.id)}<li><div class="rrow"><span class="pct" class:low={a.pct < 70}>{a.pct}%</span><span class="rtext">{a.text}</span></div><div class="top"><span class="meta">{a.n} {a.n === 1 ? 'answer' : 'answers'}</span></div></li>{/each}</ul>
      <p class="said">How often each kind of question was answered right. Next sprint in {Math.max(0, quiz.left)} {quiz.left === 1 ? 'hand' : 'hands'}.</p>{/if}
  {:else}
    {#if !list.length}<p class="said">Nothing here yet. Each decision you make is set against your rule for it: whether the solver does what the rule says with that hand. The record builds as you play.</p>
    {:else}<ul>{#each list as r (r.id)}
      <li>
        <button type="button" class="rrow" aria-expanded={open === r.id} onclick={() => (open = open === r.id ? null : r.id)}><span class="pct" class:low={r.pct < 70}>{r.pct}%</span><span class="rtext">{r.text}</span></button>
        <div class="top"><span class="meta">{r.n} {r.n === 1 ? 'decision' : 'decisions'} · gives up {r.cost.toFixed(2)} a decision · {r.misses.length} kept as {r.misses.length === 1 ? 'an example' : 'examples'}</span><span class="grow"></span><CopyButton text={() => ruleText(r)} label="Copy the rule and its misses" /></div>
        {#if open === r.id}{#each r.misses as m}<button type="button" class="miss" onclick={() => onstudy(m)}><i aria-hidden="true"></i><span><b>{m.street} <Cards cards={m.hero} /></b> on {m.board}: rule says {m.says}; solver: {m.solver}{#if m.cost >= 0.005}{' · '}EV −{m.cost.toFixed(2)}{/if}</span><span class="go" aria-hidden="true">›</span></button>{/each}
          {#if !r.misses.length}<p class="said">No decision kept where it did not hold.</p>{/if}{/if}
      </li>{/each}</ul>
      <p class="said">The percentage is how often the solver did what the rule says with your hand (at least half the time, or at a cost under 0.1). Tap a rule for the decisions where it did not hold; the copy button takes the rule and those decisions as text, for refining it.</p>{/if}
  {/if}
  <div class="go"><button type="button" class="link" onclick={onclose}>Back to the table</button></div>
</section>
