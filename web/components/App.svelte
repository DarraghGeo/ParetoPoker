<!-- The app: the page the address names. Train and Play are paged (Study beside them), so the window does not scroll. -->
<script>
  import Home from './Home.svelte';
  import Play from './play/Play.svelte';
  import StudyPage from './study/StudyPage.svelte';
  import Train from './train/Train.svelte';
  import { route } from '../lib/route.svelte.js';
  $effect(() => { document.body.className = route.page === 'train' || route.page === 'play' ? 'paged' : ''; });
</script>
{#if route.page === 'train'}<Train />{:else if route.page === 'play'}<Play />{:else if route.page === 'study'}{#key route.query}<StudyPage />{/key}{:else}<Home />{/if}
