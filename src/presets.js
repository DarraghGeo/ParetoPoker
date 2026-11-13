import { EquitySelector } from './HandSelector.js';
import { Mixer } from './Mixer.js';
import { NapkinSelector } from './NapkinSelector.js';
import { NoTuner } from './Tuner.js';

/**
 * Ready-made sets of parts for RangeStrategist: `new RangeStrategist({ engine, ...presets.napkin() })`.
 * Each call returns fresh objects.
 */
export const presets = {
  /** Hands on equity alone, every hand pure, the fundamentals untouched. */
  equity: () => ({ selector: new EquitySelector(), mixer: new Mixer(), tuner: new NoTuner() }),
  /**
   * The napkinpoker guide's hand selection, with what was measured against the solver (see
   * TUNINGS.md): out of position every value hand checks a fifth of the time on the river and
   * two fifths on the turn.
   */
  napkin: () => ({ selector: new NapkinSelector(), mixer: valueChecks({ river: 0.2, turn: 0.4 }), tuner: new NoTuner() }),
};

/** A mixer in which every value hand checks `share[street]` of the time when out of position and first to act. */
export function valueChecks(share) {
  return new Mixer([{
    role: 'value',
    when: (context) => context.position === 'oop' && !context.facing && share[context.street] > 0,
    share: (context) => 1 - share[context.street],
  }]);
}
