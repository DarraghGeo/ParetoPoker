// Text onto the clipboard; where the browser will not allow that directly, through a field selected and copied.
function copyByField(text) {
  const field = document.createElement('textarea');
  field.value = text; field.setAttribute('readonly', ''); field.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
  document.body.append(field); field.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch { /* nothing more to try */ }
  field.remove();
  return ok;
}
export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return copyByField(text); }
}
