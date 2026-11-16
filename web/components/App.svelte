<!-- The app: the page the address names. Play is paged (Study beside it), so the window does not scroll. -->
<script>
  import Home from './Home.svelte';
  import Play from './play/Play.svelte';
  import StudyPage from './study/StudyPage.svelte';
  import { route } from '../lib/route.svelte.js';
  $effect(() => { document.body.className = route.page === 'play' ? 'paged' : ''; });
</script>
{#if route.page === 'play'}<Play />{:else if route.page === 'study'}{#key route.query}<StudyPage />{/key}{:else}<Home />{/if}
