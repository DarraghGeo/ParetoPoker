import { KindMixer, TURN_KINDS, fittedMixer, presets } from '../src/index.js';
const scaled = (oop, ip) => () => ({ ...presets.fitted(), mixer: new KindMixer({ tables: { ...TURN_KINDS, flop: TURN_KINDS.turn }, rules: fittedMixer().rules, level: (c, f) => f.bet * (c.street === 'river' ? 1 : c.position === 'oop' ? oop : ip) }) });
export const variants = {
  fitted: presets.fitted,
  'level x0.8 both': scaled(0.8, 0.8),
  'level x1.25 both': scaled(1.25, 1.25),
  'level x0.8 oop, x1.25 ip': scaled(0.8, 1.25),
  'level x1.25 oop, x0.8 ip': scaled(1.25, 0.8),
};
