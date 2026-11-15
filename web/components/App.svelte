<!-- The app: the page the address names, with the body classed for it. -->
<script>
  import Home from './Home.svelte';
  import Play from './play/Play.svelte';
  import Train from './train/Train.svelte';
  import { route } from '../lib/route.svelte.js';
  $effect(() => { document.body.className = { train: 'train', play: 'train play' }[route.page] ?? ''; });
</script>
{#if route.page === 'train'}<Train />{:else if route.page === 'play'}<Play />{:else}<Home />{/if}
