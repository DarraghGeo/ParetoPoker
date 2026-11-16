// Why this hand: where it sits in your range, and what that part of the range does.
import { percent, often, capitalize, isWager } from '../words.js';
import { mergedBet } from './merged.js';

const NAME = ['your weakest hands', 'your weaker hands', 'the hands in the middle of your range', 'your stronger hands', 'your strongest hands'];

/** What separates the two groups is how much of his range each beats. */
function separation(h, role) {
  const { m, facing } = h;
  const weakSide = role.band < role.other; const own = m.actions.reduce((t, x) => t + ((facing ? x.kind !== 'fold' : isWager(x.kind)) ? x.sigma : 0), 0);
  const along = role.more ? own >= 0.25 : own <= 0.75;
  if (!along) return ' This hand goes the other way from its part of the range.';
  if (!facing && role.more && weakSide) return ' It has the least to lose by betting, which is why the bluffs come from down here.';
  if (!facing && role.more && !weakSide && h.taken[0] != null && mergedBet(h, h.taken[0])) return ' It is strong enough to be paid by some worse hands, which they are not; and weak enough to gain from his folds as well.';
  if (!facing && role.more && !weakSide) return ' It is strong enough to be paid by worse hands, which they are not.';
  if (!facing && !role.more && weakSide) return ' It is not strong enough to bet for value the way they do.';
  if (!facing && !role.more && !weakSide) return ' It wins too often at showdown to be turned into a bluff the way they are.';
  if (facing && role.more) return ' It beats more of what he bets than they do.';
  return facing ? ' It beats less of what he bets than they do.' : '';
}

/** The other fifth that does the opposite most: what it does, how strong it is, and why this hand is not like it. */
function againstOther(h, role, doing) {
  const { m, facing } = h; const other = m.bands[role.other]; const them = capitalize(NAME[role.other]);
  const text = ` ${them} ${often(other.move, doing)}.${separation(h, role)}`;
  const beats = `Those hands beat ${percent(other.eq)} of ${facing ? 'what he bets' : 'his range'} on average and this one ${percent(m.equity)}.`;
  const numbers = ` ${them} ${doing} ${percent(other.move)}. ${beats}`;
  return { text, numbers };
}

export function roleReason(h) {
  const { m, made, facing } = h; if (!(m.bands && m.band >= 0)) return null;
  const doing = facing ? 'continue' : 'bet'; const mine = m.bands[m.band]; const role = made.find((c) => c.kind === 'role');
  const more = role ? againstOther(h, role, doing) : { text: '', numbers: '' };
  return { id: 'role', text: `It is among ${NAME[m.band]} here, which ${often(mine.move, doing)}.${more.text}`,
    detail: `As a group those hands ${doing} ${percent(mine.move)} of the time.${more.numbers}` };
}
