// What the hand mixes, and what it does not do and what that would cost.
import { TAKES } from '../claims.js';
import { percent, ofPot } from '../words.js';

/** The actions that earn the same: said for every pair at once when every pair among them is, else pair by pair. */
export function sameReasons({ made, label }) {
  const same = made.filter((x) => x.kind === 'same'); if (!same.length) return [];
  const set = [...new Set(same.flatMap((c) => [c.a, c.b]))].sort((x, y) => x - y);
  const whole = same.length === (set.length * (set.length - 1)) / 2;
  const list = (ids) => `${ids.slice(0, -1).map(label).join(', ')} and ${label(ids[ids.length - 1])}`;
  if (whole) {
    return [{ id: 'same', text: `${list(set)} earn the same with this hand, so it can do ${set.length === 2 ? 'either' : 'any of them'}.`,
      detail: `To within ${ofPot(Math.max(...same.map((c) => c.within)))} of the pot.` }];
  }
  return same.map((c) => ({ id: 'same', text: `${list([c.a, c.b])} earn the same with this hand.`, detail: `To within ${ofPot(c.within)} of the pot.` }));
}

export function worseReasons({ m, made, label }) {
  return made.filter((x) => x.kind === 'worse').map((c) => {
    const played = m.actions[c.a].sigma >= TAKES;
    return { id: 'worse', text: `${label(c.a)} is worse with this hand${played ? ', though this solution still plays it sometimes' : ''}.`,
      detail: `Against his strategy in this solution it gives up ${ofPot(c.gap)} of the ` +
        `pot${played ? `; it is played ${percent(m.actions[c.a].sigma)} of the time` : ''}.` };
  });
}
