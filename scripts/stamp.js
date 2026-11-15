// The build's version: a hash of everything it emits, stamped where the page checks for a newer build (`__V__` in the
// pages and the service worker) and written to version.json, which the pages fetch to compare.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const contentOf = (file) => (file.type === 'chunk' ? file.code : file.source);

/** Ten hex characters that change whenever any emitted file does. */
function versionOf(bundle) {
  const hash = createHash('sha256');
  for (const name of Object.keys(bundle).sort()) hash.update(name).update(contentOf(bundle[name]));
  return hash.digest('hex').slice(0, 10);
}

/** An old page's address, sent on to where it now lives in the app. */
const redirect = (to) => `<!doctype html><meta charset="utf-8"><title>Pareto</title><script>location.replace('${to}')</script>`;

/** The Vite plugin: stamps the pages, emits the service worker, version.json and the old pages' redirects. */
export function stamp({ worker, moved = {} }) {
  return {
    name: 'pareto-stamp', enforce: 'post',
    generateBundle(_, bundle) {
      const version = versionOf(bundle);
      for (const file of Object.values(bundle)) if (file.fileName.endsWith('.html')) file.source = String(file.source).replaceAll('__V__', version);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: readFileSync(worker, 'utf8').replaceAll('__V__', version) });
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version }) });
      for (const [page, to] of Object.entries(moved)) this.emitFile({ type: 'asset', fileName: page, source: redirect(to) });
    },
  };
}
