// A bet or raise, one move ahead: who folds, who calls, who raises, what it earns from, the folds it needs, and the next barrel.
import { sayGroups } from '../groups.js';
import { nextBarrel } from '../next-street.js';
import { percent, often, inTen, capitalize } from '../words.js';
import { isFold, isCall, isPush, shareOf, equityAgainst, groupsAmong, had, stand } from './replies.js';
import { foldsNeeded } from './ahead.js';

/** His answers to the bet, with the hands that give each; `seen` keeps one example from being given twice. */
function answersText(k, { folds, eFold, eCall, pushes }) {
  const { x, river } = k; const seen = new Set(); const gf = groupsAmong(x, isFold); const gc = groupsAmong(x, isCall); const gp = groupsAmong(x, isPush);
  const foldPart = folds < 0.03 ? 'He hardly ever folds' : `He ${often(folds, 'folds')}${gf.length ? `: ${sayGroups(gf, 2, 0.12, seen)}` : ''}`;
  const takes = eFold != null && 1 - eFold >= 0.2 ? ', which the bet takes away' : '';
  const denial = folds >= 0.05 && eFold != null && !river ? ` Those hands had ${had(1 - eFold)} against this one${takes}.` : '';
  const callPart = gc.length ? ` He calls with ${sayGroups(gc, 2, 0.12, seen)}; against those this hand is ${stand(eCall ?? 0)}.` : '';
  const pushPart = pushes >= 0.08 && gp.length ? ` He raises with ${sayGroups(gp, 2, 0.12, seen)}.` : '';
  return { foldPart, rest: `${denial}${callPart}${pushPart}` };
}

function earnsFrom(eCall, folds) {
  if ((eCall ?? 0) < 0.5 && folds >= 0.2) return ' The bet earns from the folds, not from the calls.';
  return (eCall ?? 0) >= 0.5 && folds < 0.5 ? ' The bet earns from the calls.' : '';
}

function answersNumbers(x, { folds, eFold, eCall, pushes }) {
  const foldHands = eFold != null ? ` (those hands had ${percent(1 - eFold)} equity against this one)` : '';
  const callHands = eCall != null ? ` (this hand has ${percent(eCall)} against those)` : '';
  const raises = pushes >= 0.005 ? `, raises ${percent(pushes)}` : '';
  return `He folds ${percent(folds)}${foldHands}, calls ${percent(shareOf(x, (p) => p.kind === 'call'))}${callHands}${raises}.`;
}

function needText(k, best, need, folds) {
  const same = inTen(need) === inTen(folds); const other = k.label(k.other);
  if (best && same) return ` It needs him to fold ${inTen(need)}, and that is just about what he does: which is why it is close.`;
  if (best) return ` It stays a bet as long as he folds more than ${inTen(need)}; he folds ${inTen(folds)}.`;
  if (same) return ` To beat ${other} it would need him to fold ${inTen(need)}, a little more than he does.`;
  return ` To beat ${other} it would need him to fold ${inTen(need)}; he folds ${inTen(folds)}.`;
}

/** What would change it: how much he would have to fold for the bet to be worth what the quiet action is. */
function foldsItNeeds(k, best, numbers) {
  const fn = foldsNeeded(k, k.top, k.other); const need = fn ? fn.need : null;
  if (need != null && need <= 0.02) return ' It does not need him to fold at all: it would still be a bet if he never did.';
  if (!(need != null && need < 1)) return '';
  numbers.push(`It is worth what ${k.label(k.other)} is when he folds ${percent(need)}.`);
  return needText(k, best, need, fn.folds);
}

/** And what comes next, if he calls. */
function barrelText(k, numbers) {
  const nb = nextBarrel(k.s, k.m.combo, k.top); if (!nb) return '';
  numbers.push(`After a call it bets the ${nb.street} ${percent(nb.bets)} of the time on average.`);
  if (nb.share >= 0.9) return ` If he calls, it bets the ${nb.street} too on almost any card.`;
  if (nb.share <= 0.08) return ` If he calls, it gives up on the ${nb.street}: this is a one-street bet.`;
  return ` If he calls, it bets the ${nb.street} again ${nb.named}.`;
}

/** A bet or raise that meets his answers. */
export function betMove(k) {
  const { x, other, exact, mv } = k; const act = k.label(k.top);
  const answers = { folds: shareOf(x, isFold), eFold: equityAgainst(x, isFold), eCall: equityAgainst(x, isCall), pushes: shareOf(x, isPush) };
  const best = other == null || (exact != null ? exact >= -0.3 : x.value >= mv.actions[other].value);
  const { foldPart, rest } = answersText(k, answers); const numbers = [answersNumbers(x, answers)];
  let text = `${best ? `${capitalize(act)} comes out best. ` : ''}${foldPart}${best ? '' : ` to ${act}`}.${rest}${earnsFrom(answers.eCall, answers.folds)}`;
  if (other != null && !((answers.eCall ?? 0) >= 0.5 && answers.folds < 0.5)) text += foldsItNeeds(k, best, numbers);
  if (!k.river && shareOf(x, (p) => p.kind === 'call') >= 0.15) text += barrelText(k, numbers);
  return { id: 'move', text, detail: numbers.join(' ') + k.versus };
}
