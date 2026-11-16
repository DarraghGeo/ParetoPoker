// Where in the app the page is: the part of the address after "#/" (home, play, study), and what follows its "?"
// (the spot Study opens on). A reload opens on the home page.
const PAGES = new Set(['', 'play', 'study']);
const hash = () => location.hash.replace(/^#\/?/, '');
const read = () => { const page = hash().split('?')[0]; return PAGES.has(page) ? page : ''; };
const queryOf = () => { const at = hash().indexOf('?'); return at < 0 ? '' : hash().slice(at); };

export const route = $state({ page: read(), query: queryOf() });
addEventListener('hashchange', () => { route.page = read(); route.query = queryOf(); });
if (performance.getEntriesByType('navigation')[0]?.type === 'reload' && route.page) { location.replace('#/'); route.page = ''; route.query = ''; }
