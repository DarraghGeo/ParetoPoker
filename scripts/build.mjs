// Builds the page into docs/ (what GitHub Pages serves): node scripts/build.mjs
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
mkdirSync('docs', { recursive: true });
const common = { bundle: true, minify: true, conditions: ['browser'], platform: 'browser', target: 'es2022', logLevel: 'warning' };
await build({ ...common, entryPoints: ['web/app.js'], outfile: 'docs/app.js', format: 'esm' });
await build({ ...common, entryPoints: ['web/worker.js'], outfile: 'docs/worker.js', format: 'iife' });
await build({ ...common, entryPoints: ['web/train.js'], outfile: 'docs/train.js', format: 'esm' });
await build({ ...common, entryPoints: ['web/train-worker.js'], outfile: 'docs/train-worker.js', format: 'iife' });
copyFileSync('web/style.css', 'docs/style.css');
// Stamp a version on every file the page loads, so a browser never keeps an old build
const built = ['app.js', 'worker.js', 'train.js', 'train-worker.js', 'style.css'];
const version = built.reduce((hash, file) => hash.update(readFileSync(`docs/${file}`)), createHash('sha256')).digest('hex').slice(0, 10);
writeFileSync('docs/app.js', readFileSync('docs/app.js', 'utf8').replaceAll('./worker.js', `./worker.js?v=${version}`));
writeFileSync('docs/train.js', readFileSync('docs/train.js', 'utf8').replaceAll('./train-worker.js', `./train-worker.js?v=${version}`));
// The page opens on the choice between the two: index.html, then study.html or train.html
for (const page of ['index.html', 'study.html', 'train.html']) writeFileSync(`docs/${page}`, readFileSync(`web/${page}`, 'utf8').replaceAll('__V__', version));
console.log(`built docs/ (${version})`);
