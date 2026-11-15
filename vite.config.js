// The page is built into docs/ (what GitHub Pages serves): npm run build
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { stamp } from './scripts/stamp.js';

const at = (path) => fileURLToPath(new URL(path, import.meta.url));
const pages = ['index'];
/** Pages that moved into the app: their old addresses redirect. */
const moved = { 'train.html': './#/train', 'play.html': './#/play', 'study.html': './#/study' };

export default defineConfig({
  root: at('web'),
  base: './',
  plugins: [svelte(), stamp({ worker: at('web/sw.js'), moved })],
  worker: { format: 'iife' },
  build: {
    outDir: at('docs'), emptyOutDir: true, target: 'es2022',
    rollupOptions: { input: Object.fromEntries(pages.map((page) => [page, at(`web/${page}.html`)])) },
  },
});
