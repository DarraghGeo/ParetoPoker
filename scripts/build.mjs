// Builds the page into docs/ (what GitHub Pages serves): node scripts/build.mjs
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
mkdirSync('docs', { recursive: true });
const common = { bundle: true, minify: true, conditions: ['browser'], platform: 'browser', target: 'es2022', logLevel: 'warning' };
await build({ ...common, entryPoints: ['web/app.js'], outfile: 'docs/app.js', format: 'esm' });
await build({ ...common, entryPoints: ['web/worker.js'], outfile: 'docs/worker.js', format: 'iife' });
copyFileSync('web/style.css', 'docs/style.css');
// Stamp a version on every file the page loads, so a browser never keeps an old build
const version = createHash('sha256').update(readFileSync('docs/app.js')).update(readFileSync('docs/worker.js')).update(readFileSync('docs/style.css')).digest('hex').slice(0, 10);
writeFileSync('docs/app.js', readFileSync('docs/app.js', 'utf8').replaceAll('./worker.js', `./worker.js?v=${version}`));
writeFileSync('docs/index.html', readFileSync('web/index.html', 'utf8').replaceAll('__V__', version));
console.log(`built docs/ (${version})`);
