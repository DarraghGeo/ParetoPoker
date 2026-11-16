<!-- The opening page: the mark and the two ways in. -->
<script>
  const WAYS = [
    ['#/study', 'Study', 'Solve a spot, walk the line, and read why each hand plays the way it does.'],
    ['#/play', 'Play', 'Play whole hands heads up against the solved villain, on the clock, flop to river. Take any spot to Study, or copy the hand out for coaching.'],
  ];
</script>
<div class="rule"></div>
<main class="home">
  <h1><svg class="mark" viewBox="0 0 512 512" width="44" height="44" aria-hidden="true"><rect width="512" height="512" rx="72" fill="#15171B" /><rect x="96" y="150" width="68" height="212" fill="#7FCDBB" /><rect x="180" y="150" width="68" height="212" fill="#F4C261" /><rect x="180" y="150" width="68" height="90" fill="#7FCDBB" /><rect x="264" y="150" width="68" height="212" fill="#F4C261" /><rect x="348" y="150" width="68" height="212" fill="#F08A6B" /><rect x="348" y="150" width="68" height="60" fill="#F4C261" /></svg><span>Pareto</span></h1>
  <nav class="choose" aria-label="Study or play">
    {#each WAYS as [href, kind, what]}<a {href}><span class="kind">{kind}</span><span class="what">{what}</span></a>{/each}
  </nav>
</main>
