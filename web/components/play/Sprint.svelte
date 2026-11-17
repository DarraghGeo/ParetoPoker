<!-- A sprint question, where hero's actions usually are, so that the table stays in view: the question, its answers as
     buttons (three small butterflies where it asks for one), and once answered the right answer and why, in as little room as it takes, then the next. -->
<script>
  import { answer, next } from '../../lib/play/quiz.js';
  let { game } = $props();
  const s = $derived(game.sprint); const q = $derived(s.questions[s.at]); const done = $derived(s.picked != null);
  const most = (chart) => Math.max(0.0001, ...chart.flatMap((r) => [r[1], r[2]]));
  const state = (k) => (!done ? '' : k === q.answer ? 'right' : k === s.picked ? 'wrong' : 'rest');
</script>
<div class="sprint">
  <p class="kind"><span>Sprint {s.at + 1} of {s.questions.length}</span><span>{s.right} right</span></p>
  {#if !(done && q.charts)}<p class="ask">{q.ask}</p>{/if}
  {#if q.charts}
    <div class="charts">{#each q.charts as chart, k}{@const m = most(chart)}
      <button type="button" class="opt chart {state(k)}" disabled={done} aria-label="Butterfly {q.options[k]}" onclick={() => answer(game, k)}>
        <b>{q.options[k]}</b>{#each chart as r}<span class="frow"><span class="wing me"><i style="width:{(100 * r[1] / m).toFixed(0)}%"></i></span><span class="code">{r[0]}</span><span class="wing him"><i style="width:{(100 * r[2] / m).toFixed(0)}%"></i></span></span>{/each}
      </button>{/each}</div>
  {:else if done}<p class="was">Answer: <b>{q.options[q.answer]}</b>{#if s.picked !== q.answer}<span> · you said {q.options[s.picked]}</span>{/if}</p>
  {:else}<div class="opts" class:two={q.options.length === 2}>{#each q.options as o, k}<button type="button" class="opt {state(k)}" disabled={done} onclick={() => answer(game, k)}>{o}</button>{/each}</div>{/if}
  {#if done}<p class="because" class:good={s.picked === q.answer}><b>{s.picked === q.answer ? 'Right.' : 'Not quite.'}</b> {q.why}</p>
    <button type="button" class="primary" onclick={() => next(game)}>{s.at + 1 < s.questions.length ? 'Next question' : 'Back to the hand'}</button>{/if}
</div>
