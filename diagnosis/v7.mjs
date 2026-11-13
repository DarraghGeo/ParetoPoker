import { fittedTuner, presets } from '../src/index.js';
export const variants = {
  'equity, no tuner': () => presets.equity(),
  'napkin, no tuner': () => presets.napkin(),
  'napkin + fitted tuner': () => ({ ...presets.napkin(), tuner: fittedTuner() }),
  'equity + fitted tuner': () => ({ ...presets.equity(), tuner: fittedTuner() }),
};
