// Builds the page into docs/ (what GitHub Pages serves): node scripts/build.mjs
import { build } from 'esbuild';
import { copyFileSync, mkdirSync } from 'node:fs';
mkdirSync('docs', { recursive: true });
const common = { bundle: true, minify: true, conditions: ['browser'], platform: 'browser', target: 'es2022', logLevel: 'warning' };
await build({ ...common, entryPoints: ['web/app.js'], outfile: 'docs/app.js', format: 'esm' });
await build({ ...common, entryPoints: ['web/worker.js'], outfile: 'docs/worker.js', format: 'iife' });
copyFileSync('web/index.html', 'docs/index.html');
copyFileSync('web/style.css', 'docs/style.css');
console.log('built docs/');
