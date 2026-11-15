// What this hand's type does that the other hands of about its strength do not.
import { TYPES } from '../../features.js';
import { percent } from '../words.js';

const apart = (x, y) => Math.abs(x - y) >= 0.2;

/** Its own type against the rest; or, when there are too few of its type to speak of, draws against the hands without one. */
function comparedGroup({ m, river }) {
  const nr = m.near; const floor = nr ? 0.02 * nr.all : 0;
  if (nr && nr.same.weight >= floor && nr.rest.weight >= floor && apart(nr.same.move, nr.rest.move)) {
    const group = TYPES[nr.type] ?? `hands with ${nr.type.replace(' + backdoor flush', ' and a backdoor flush draw')}`;
    return { group, mine: nr.same.move, theirs: nr.rest.move, rest: 'the rest' };
  }
  if (nr && nr.draw && nr.draws.weight > 0 && nr.others.weight >= floor && apart(nr.draws.move, nr.others.move)) {
    return { group: 'the draws', mine: nr.draws.move, theirs: nr.others.move, rest: 'the hands without a draw' };
  }
  if (nr && !nr.draw && m.features.own === 0 && !river && nr.draws.weight >= floor && nr.others.weight > 0 && apart(nr.draws.move, nr.others.move)) {
    return { group: 'the hands without a draw', mine: nr.others.move, theirs: nr.draws.move, rest: 'the draws' };
  }
  return null;
}

const NO_DRAW = ' It has no draw: when a bet is called it has almost nothing to improve to, so the draws do the betting at this strength.';
const PAIR_CHECKS = ' A pair still wins some showdowns when checked; the hands with nothing at all do the bluffing.';

/** Why its type plays that way, where a reason a player gives fits. */
function because({ m, facing, river }, more, isDraw, outs) {
  const own = m.features.own;
  if (!facing && more && isDraw && outs > 0) return ' A draw has two ways to win: he folds now, or it gets there.';
  if (!facing && !more && !isDraw && !river && own === 0) return NO_DRAW;
  if (!facing && !more && river && own === 1 && m.equity < 0.8) return PAIR_CHECKS;
  if (!facing && more && river && own === 0) return ' It has no showdown value to protect.';
  return facing && more && isDraw && outs > 0 ? ' It can still make the best hand.' : '';
}

export function typeReason(h) {
  const { m, facing } = h; const kind = comparedGroup(h); if (!kind) return null;
  const doesIt = m.actions.reduce((t, x) => t + (x.kind !== (facing ? 'fold' : 'check') ? x.sigma : 0), 0);
  const more = kind.mine > kind.theirs; if (more ? doesIt < 0.3 : doesIt > 0.7) return null;
  const doing = facing ? 'continue' : 'bet'; const outs = m.features.flushOuts + m.features.straightOuts; const isDraw = m.near.draw;
  const text = `Among your hands of about this strength, ${kind.group} ${doing} ${more ? 'more' : 'less'} often than ${kind.rest}.`
    + because(h, more, isDraw, outs);
  const outsSaid = isDraw && outs > 0 ? ` This hand has ${outs} outs.` : '';
  const detail = `In this solution ${kind.group} ${doing} ${percent(kind.mine)} of the time and ${kind.rest} ${percent(kind.theirs)}.${outsSaid}`;
  return { id: 'type', text, detail };
}
