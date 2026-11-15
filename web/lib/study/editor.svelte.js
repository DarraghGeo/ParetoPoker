// The range editor: the ranges of the version on screen changed with nothing solved (painted in and out, the curve's knobs
// dragged, the dials slid), drawn as they would be, then saved as a new version. One picture is asked for at a time:
// while one is out, the latest change waits for it.
import { cellsOf, paintedNotation } from './paint.js';
import { turnTo } from './solving.js';
import { addVersion, conf, placeOf, version, versionOf } from './versions.svelte.js';

const preview = { busy: false, stale: false, id: 0 };
const copy = (x) => JSON.parse(JSON.stringify(x));

export function openEditor(game) {
  const v = version(game); if (!game.decision || v.fixed) return;
  game.edit = { who: game.decision.seat ?? 'oop', oop: v.oop, ip: v.ip, dials: copy(v.dials) }; game.editView = null;
  Object.assign(preview, { busy: false, stale: false });
  game.panel = 'editor'; askPreview(game);
}

export function askPreview(game) {
  if (preview.busy) { preview.stale = true; return; }
  preview.busy = true; preview.stale = false;
  const { oop, ip, dials } = $state.snapshot(game.edit);
  game.worker.postMessage({ type: 'preview', id: ++preview.id, config: { board: conf(game).board, oop, ip, dials } });
}

export function onPreview(game, data) {
  preview.busy = false;
  if (!data.error) game.editView = data.sides;
  if (preview.stale && game.edit) askPreview(game);
}

/** A stroke on the chart: the range being edited with its cells painted in or out. */
export function paintEdit(game, stroke) {
  const who = game.edit.who; game.edit[who] = paintedNotation(cellsOf(game.edit[who]) ?? new Map(), stroke);
  askPreview(game);
}

/** One of the dials or knobs of the range being edited set to a value. */
export function setDial(game, key, value) { game.edit.dials[game.edit.who][key] = value; askPreview(game); }
export function setKnob(game, k, value) { game.edit.dials[game.edit.who].curve[k] = value; askPreview(game); }

/** A new version after the one on screen, with the ranges as edited; any that came after it are dropped. */
export function saveEdit(game) {
  const { oop, ip, dials } = $state.snapshot(game.edit);
  if (!cellsOf(oop)?.size || !cellsOf(ip)?.size) return;
  const index = addVersion(game, versionOf(game, { oop, ip, dials, base: version(game).base, pos: placeOf(game) }));
  game.panel = ''; turnTo(game, index);
}
