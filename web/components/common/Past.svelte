<!-- The streets so far: each street's actions, with who took each. `who(a)` names the player of an action. -->
<script>let { history = [], who } = $props();</script>
<div class="past">
  {#each history.filter((h) => h.actions.length) as h}
    <div><span class="street">{h.street}</span>{#each h.actions as a}<span><i>{who(a)}</i> {a.label}</span>{/each}</div>
  {/each}
</div>
