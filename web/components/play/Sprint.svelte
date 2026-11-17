<!-- A sprint question, where hero's actions usually are, so that the table stays in view: the question and its answers as
     buttons (three small butterflies where it asks for one). A tap is the answer: the choice flashes green or red, the
     right one green, and the next question follows at once, with no words about it. -->
<script>
  import { answer, next } from '../../lib/play/quiz.js';
  let { game } = $props();
  /** How long an answer's colours stay before the next question, in milliseconds. */
  const FLASH = 650;
  const s = $derived(game.sprint); const q = $derived(s.questions[s.at]); const done = $derived(s.picked != null);
  const most = (chart) => Math.max(0.0001, ...chart.flatMap((r) => [r[1], r[2]]));
  const state = (k) => (!done ? '' : k === q.answer ? 'right' : k === s.picked ? 'wrong' : 'rest');
  function pick(k) { if (done) return; answer(game, k); setTimeout(() => next(game), FLASH); }
</script>
<div class="sprint">
  <p class="kind"><span>Sprint {s.at + 1} of {s.questions.length}</span></p>
  <p class="ask">{q.ask}</p>
  {#if q.charts}
    <div class="charts">{#each q.charts as chart, k}{@const m = most(chart)}
      <button type="button" class="opt chart {state(k)}" aria-label="Butterfly {q.options[k]}" onclick={() => pick(k)}>
        <b>{q.options[k]}</b>{#each chart as r}<span class="frow"><span class="wing me"><i style="width:{(100 * r[1] / m).toFixed(0)}%"></i></span><span class="code">{r[0]}</span><span class="wing him"><i style="width:{(100 * r[2] / m).toFixed(0)}%"></i></span></span>{/each}
      </button>{/each}</div>
  {:else}<div class="opts" class:two={q.options.length === 2}>{#each q.options as o, k}<button type="button" class="opt {state(k)}" onclick={() => pick(k)}>{o}</button>{/each}</div>{/if}
</div>
