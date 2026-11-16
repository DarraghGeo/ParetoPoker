// What Study keeps for the next visit, beside the setup: whether the chart is the grid or the curve, and the action chart's form.
import { keep, load } from '../storage.js';
import { SETUP_KEY } from '../setup.js';

/** The action chart's forms, in turn: one bar; a row for each made hand; a ladder of both ranges on one scale; the butterfly,
 *  both ranges back to back in rows by made hand. */
export const CHARTS = ['single', 'split', 'ladder', 'butterfly'];

export function loadViews() {
  const saved = load(SETUP_KEY) ?? {};
  // the butterfly is the chart a visit opens on; a choice saved before it was the default is taken to it once
  const chart = saved.v === 2 && CHARTS.includes(saved.chart) ? saved.chart : 'butterfly';
  return { view: saved.view === 'curve' ? 'curve' : 'grid', chart, lines: !!saved.lines, detail: !!saved.detail, v: 2 };
}

/** Keep the setup and the views for the next visit (and for Train and Play, which take the setup). */
export const remember = (game, config) => keep(SETUP_KEY, { config, ...game.views });

export const nextChart = (chart) => CHARTS[(CHARTS.indexOf(chart) + 1) % CHARTS.length];
/** The chart button's next step: from the butterfly, its equity lines first, then on round the forms. */
export function nextView(views) {
  if (views.chart === 'butterfly' && !views.lines) return { chart: 'butterfly', lines: true };
  return { chart: nextChart(views.chart), lines: false };
}
