// Days as the pages keep and show them: a date as a key ("2026-11-15"), and as a name ("Today", "Sat 14 Nov").
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export function dayName(key) {
  if (key === dayKey()) return 'Today';
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}
