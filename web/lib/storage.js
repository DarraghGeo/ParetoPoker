// What the app keeps in the browser: JSON under a key, read and written without failing where storage is not allowed.
export function load(key, fallback = null) {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; } catch { return fallback; }
}
export function keep(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* a private window */ }
}
