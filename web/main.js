// The app's entry: mount it, and keep the installed app current.
import { mount } from 'svelte';
import App from './components/App.svelte';
import { keepFresh } from './lib/freshness.js';
import { route } from './lib/route.svelte.js';
import './style.css';

mount(App, { target: document.getElementById('app') });
keepFresh(() => route.page === '');
