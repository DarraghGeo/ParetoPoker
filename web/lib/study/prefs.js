// What Study keeps for the next visit, beside the setup: whether the chart is the grid or the curve, and the action chart's form.
import { keep, load } from '../storage.js';
import { SETUP_KEY } from '../setup.js';

/** The action chart's forms, in turn: one bar; a row for each made hand; a ladder of both ranges on one scale; the butterfly,
 *  both ranges back to back in rows by made hand. */
export const CHARTS = ['single', 'split', 'ladder', 'butterfly'];

export function loadViews() {
  const saved = load(SETUP_KEY) ?? {};
  return { view: saved.view === 'curve' ? 'curve' : 'grid', chart: CHARTS.includes(saved.chart) ? saved.chart : saved.split ? 'split' : 'single', detail: !!saved.detail };
}

/** Keep the setup and the views for the next visit (and for Train and Play, which take the setup). */
export const remember = (game, config) => keep(SETUP_KEY, { config, ...game.views });

export const nextChart = (chart) => CHARTS[(CHARTS.indexOf(chart) + 1) % CHARTS.length];
