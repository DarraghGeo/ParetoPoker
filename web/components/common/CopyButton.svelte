<!-- A copy button: copies its text, and says how it went for a moment with a tick or a cross. -->
<script>
  import { copyText } from '../../lib/clipboard.js';
  import Icon from './Icon.svelte';
  let { text, label = 'Copy' } = $props();
  let state = $state('');
  async function copy() { state = (await copyText(text())) ? 'done' : 'failed'; setTimeout(() => (state = ''), 1400); }
</script>
<button type="button" class="icon {state}" aria-label={state === 'done' ? 'Copied' : state === 'failed' ? 'Could not copy' : label} title={label} onclick={copy}><Icon name={state === 'done' ? 'tick' : state === 'failed' ? 'cross' : 'copy'} /></button>
