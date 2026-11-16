<!-- The app: the page the address names. Study and Play are loaded when first opened (and fetched ahead while the home
     page sits idle), so the home page starts at once. Play is paged (Study beside it), so the window does not scroll. -->
<script>
  import Home from './Home.svelte';
  import { route } from '../lib/route.svelte.js';
  const PAGES = { play: () => import('./play/Play.svelte'), study: () => import('./study/StudyPage.svelte') };
  const loaded = {}; const load = (page) => (loaded[page] ??= PAGES[page]());
  $effect(() => { document.body.className = route.page === 'play' ? 'paged' : ''; });
  // fetch both pages ahead once the browser has a quiet moment
  const idle = globalThis.requestIdleCallback ?? ((fn) => setTimeout(fn, 1200));
  idle(() => { for (const page of Object.keys(PAGES)) load(page).catch(() => { delete loaded[page]; }); });
</script>
{#if PAGES[route.page]}{#await load(route.page) then Page}{#if route.page === 'study'}{#key route.query}<Page.default />{/key}{:else}<Page.default />{/if}{/await}{:else}<Home />{/if}
