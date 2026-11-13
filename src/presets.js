import { EquitySelector } from './HandSelector.js';
import { Mixer } from './Mixer.js';
import { NapkinSelector } from './NapkinSelector.js';
import { NoTuner, fittedTuner } from './Tuner.js';

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
  /**
   * The current best: the guide's hand selection with the tuner and the mixer fitted to the
   * solver during the diagnosis run (TUNINGS.md).
   */
  fitted: () => ({ selector: new NapkinSelector({ turnCalls: 'ehs2-ip' }), mixer: fittedMixer(), tuner: fittedTuner() }),
};

/**
 * The mixer fitted to the solver. Out of position and first to act, value hands do not always
 * bet: on the river the strongest (90% equity or more against his range) bet half the time and
 * the rest three quarters; on the turn every value hand bets 45% of the time. Facing a turn bet,
 * a value hand raises a quarter of the time and calls the rest.
 */
export function fittedMixer() {
  const open = (street) => (context) => context.position === 'oop' && !context.facing && context.street === street;
  return new Mixer([
    { role: 'value', when: open('turn'), share: 0.45 },
    // In position on the turn the strongest value always bets; thinner value bets about half the time
    { role: 'value', when: (context) => context.position === 'ip' && !context.facing && context.street === 'turn', share: (context) => context.strength.map((e) => (e >= 0.85 ? 1 : 0.55)) },
    { role: 'value', when: open('river'), share: (context) => context.strength.map((e) => (e >= 0.9 ? 0.5 : 0.75)) },
    // Facing a turn bet the solver mostly calls with its strongest hands; raising them all loses
    { role: 'value', when: (context) => context.street === 'turn' && context.facing && (context.spot.raises ?? 0) === 0, share: 0.25 },
  ]);
}

/** A mixer in which every value hand checks `share[street]` of the time when out of position and first to act. */
export function valueChecks(share) {
  return new Mixer([{
    role: 'value',
    when: (context) => context.position === 'oop' && !context.facing && share[context.street] > 0,
    share: (context) => 1 - share[context.street],
  }]);
}
