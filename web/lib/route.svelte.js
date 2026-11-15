// Where in the app the page is: the part of the address after "#/" (home, train, play). A reload opens on the home page.
const PAGES = new Set(['', 'train', 'play']);
const read = () => { const page = location.hash.replace(/^#\/?/, '').split('?')[0]; return PAGES.has(page) ? page : ''; };

export const route = $state({ page: read() });
addEventListener('hashchange', () => { route.page = read(); });
if (performance.getEntriesByType('navigation')[0]?.type === 'reload' && route.page) { location.replace('#/'); route.page = ''; }
