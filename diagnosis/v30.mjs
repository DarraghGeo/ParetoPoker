import { KindMixer, TURN_FACING_KINDS, TURN_KINDS, fittedMixer, presets } from '../src/index.js';
const make = (facing) => () => ({ ...presets.fitted(), mixer: new KindMixer({ tables: { ...TURN_KINDS, facing }, rules: fittedMixer().rules }) });
export const variants = {
  fitted: presets.fitted,
  'facing a turn bet by kind, both seats': make(TURN_FACING_KINDS),
  'facing a turn bet by kind, in position only': make({ turn: { ip: TURN_FACING_KINDS.turn.ip } }),
  'facing a turn bet by kind, out of position only': make({ turn: { oop: TURN_FACING_KINDS.turn.oop } }),
};
