// A check, one move ahead: what he does when checked to, and what a bet would have needed instead.
import { sayGroups } from '../groups.js';
import { percent, often, inTen } from '../words.js';
import { isCall, isPush, shareOf, equityAgainst, groupsAmong, stand } from './replies.js';
import { foldsNeeded } from './ahead.js';

function checkText(x) {
  const pushes = shareOf(x, isPush); const gp = groupsAmong(x, isPush); const gc = groupsAmong(x, isCall);
  if (pushes >= 0.5) {
    const stands = stand(equityAgainst(x, isPush) ?? 0); const hands = gp.length ? `, with ${sayGroups(gp)}` : '';
    return `It checks expecting a bet: he ${often(pushes, 'bets')} when checked to${hands}, and against those hands it is ${stands}.`;
  }
  const bets = pushes >= 0.15 && gp.length ? ` When he does bet it is ${sayGroups(gp)}.` : '';
  const stands = stand(equityAgainst(x, isCall) ?? 0);
  return `It checks, and he ${often(1 - pushes, 'checks')} behind${gc.length ? ` with ${sayGroups(gc)}` : ''}: against those hands it is ${stands}.${bets}`;
}

function checkNumbers(x) {
  const ePush = equityAgainst(x, isPush); const eCall = equityAgainst(x, isCall);
  const bettors = ePush != null ? ` (this hand has ${percent(ePush)} against those hands)` : '';
  const checkers = eCall != null ? ` and checks the rest (${percent(eCall)} against those)` : '';
  return `After a check he bets ${percent(shareOf(x, isPush))} of the time${bettors}${checkers}.`;
}

/** The hand's equity against the hands that would call the bet, and what those hands are. */
function callersOf(bet) {
  const cw = bet.parts.filter((q) => q.kind === 'call'); const cs = cw.reduce((t, q) => t + q.share, 0);
  return { equity: cs > 0 ? cw.reduce((t, q) => t + q.share * (q.equity ?? 0), 0) / cs : null, groups: cw.length ? (cw[0].groups ?? []) : [] };
}

/** What would change it: what the best bet would need, or why a bet does worse. */
function whyNotBet(k, fn, pushes) {
  const { m, exact } = k; const callers = callersOf(k.mv.actions[k.other]); const ec = callers.equity;
  if (exact != null && Math.abs(exact) < 0.5) return ' A bet would do just as well, which is why it sometimes is one.';
  if (fn && fn.need >= 1) return ' A bet would lose even if he folded far more than he does: called or raised, it gives back more than the folds bring.';
  if (ec != null && ec < 0.5 && m.equity >= 0.3) {
    const calledBy = callers.groups.length ? sayGroups(callers.groups) : 'better ones';
    return ` A bet would fold out the hands it beats and be called by ${calledBy}: it would turn a hand that wins its share of showdowns into a bluff.`;
  }
  if (!(ec != null && ec >= 0.5)) return '';
  if (pushes >= 0.3) return ' It is ahead of what would call a bet, but the check earns more: he bets worse hands himself when checked to.';
  return ' It is ahead of what would call a bet, but not by enough to pay for the raises a bet would meet.';
}

/** A check that meets his answers: what he does when checked to, and what would make it a bet. */
export function checkMove(k) {
  const { x, other, label } = k; let text = checkText(x); const numbers = [checkNumbers(x)];
  if (other != null && k.mv.actions[other].parts.length) {
    const fn = foldsNeeded(k, other, k.top);
    if (fn && fn.need > fn.folds + 0.03 && fn.need < 1) {
      const folds = inTen(fn.need) === inTen(fn.folds) ? 'a little less than that' : inTen(fn.folds);
      text += ` To bet it, he would have to fold ${inTen(fn.need)}; he folds ${folds}.`;
      numbers.push(`${label(other)} would be worth what checking is if he folded ${percent(fn.need)}; he folds ${percent(fn.folds)}.`);
    } else text += whyNotBet(k, fn, shareOf(x, isPush));
  }
  return { id: 'move', text, detail: numbers.join(' ') + k.versus };
}
