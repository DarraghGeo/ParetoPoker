// The range facing a bet: how much of it continues, against what, on what price, and which hands fold, call and raise.
import { groupsOf, sayGroups } from '../groups.js';
import { percent, howMuch, isWager } from '../words.js';
import { takingRange, groupShares } from './common.js';
import { strengthReason } from './strength.js';

function facingLine(fold, raise) {
  if (fold <= 0.15) return 'You continue with almost your whole range against this bet.';
  if (fold >= 0.7) return 'You fold most of your range to this bet.';
  const part = fold <= 0.4 ? 'two thirds' : fold <= 0.55 ? 'half' : 'a third';
  return `You continue with about ${part} of your range against this bet${raise >= 0.12 ? ', and raise some of it' : ''}.`;
}

/** How much of the range has the price on equity against what he is betting. */
function hasPrice(s, price, W) {
  const { fs, f } = s; const eMine = s.equity(); let has = 0;
  for (let c = 0; c < fs.COMBOS; c++) if (f.mine[c] > 0 && !Number.isNaN(eMine[c]) && eMine[c] >= price) has += f.mine[c];
  return has / W;
}

const FEWER_CONTINUE = ' Fewer continue than have the price: a hand that just has it now does not keep it when he bets again, so the bottom of those folds.';
const IMPROVE_OR_RAISE = 'hands that can still improve, and raises that can win the pot at once';

/** Why: the price against what the range has, and what is still to come. */
function whyReason(price, has, fold, raise, calls, river) {
  const cont = 1 - fold;
  let why = `Why you continue this often: the call needs ${percent(price)}, and ${howMuch(has)} of your range has that against what he is betting.`;
  if (!river && has - cont >= 0.08) why += FEWER_CONTINUE;
  else if (has - cont <= -0.08) why += ` More continue than have the price on equity: the rest are ${river ? 'bluff raises' : IMPROVE_OR_RAISE}.`;
  const detail = `${percent(has)} of your range has ${percent(price)} equity or more against his betting range. You continue with ${percent(cont)}: call ` +
    `${percent(calls)}, raise ${percent(raise)}.`;
  return { id: 'why', text: why, detail };
}

/** How the folding compares with what would make his bet pay with nothing: said as what it means for him. */
function folded(fold, alpha) {
  if (fold >= alpha + 0.08) {
    return 'You fold more than would stop him betting any two cards, so his bluffs pay here: his range is strong enough on this board that defending wider ' +
      'would cost you more than that.';
  }
  if (fold <= alpha - 0.08) {
    return 'You fold less than he would need for a bet with nothing to pay: your range has too much against what he is betting to give up, and if he bet ' +
      'more often with nothing you would not need to change.';
  }
  return 'You fold about as much as makes a bet with nothing break even for him: fold more and he could bet any two cards, fold less and his bluffs ' +
    'would lose.';
}

/** What would change it: nothing more to come, or a bet with no hand behind it. */
function priceReason(has, fold, alpha, river) {
  const said = [];
  if (!river && Math.abs(has - (1 - fold)) >= 0.08) said.push(`If this were the last bet, ${howMuch(has)} of your range would continue: everything with the price.`);
  said.push(folded(fold, alpha));
  return { id: 'price', text: said.join(' '), detail: `You fold ${percent(fold)}. His bet breaks even as a pure bluff when you fold ${percent(alpha)}.` };
}

function whichReason(s, fold, raise, calls) {
  const { fs, f } = s; const range = (pick) => groupsOf(fs, f.board, takingRange(s, pick));
  const gf = range((k) => k === 'fold'); const gc = range((k) => k === 'call'); const gr = range(isWager);
  let text = ''; if (fold >= 0.05 && gf.length) text += `You fold ${sayGroups(gf)}. `; if (gc.length) text += `You call with ${sayGroups(gc, 3)}. `;
  if (raise >= 0.05 && gr.length) text += `The raises are ${sayGroups(gr)}.`;
  return text ? { id: 'which', text: text.trim(), detail: `Fold ${percent(fold)}, call ${percent(calls)}, raise ${percent(raise)}.` } : null;
}

/** The decision as explainRange reads it ({ s, share, W, strong, facts, river }). Returns the line and its reasons. */
export function explainFacing({ s, share, W, strong, facts, river }) {
  const { fs, f } = s; const fold = share((k) => k === 'fold'); const raise = share(isWager); const calls = share((k) => k === 'call');
  const price = s.toCall / (s.pot + s.toCall); const gHis = groupsOf(fs, f.board, f.his); const alpha = s.toCall / s.pot;
  Object.assign(facts, { fold, raise, price, alpha }); const reasons = [];
  if (gHis.length) reasons.push({ id: 'his', text: `He is betting ${sayGroups(gHis, 3)}.`, detail: groupShares(gHis, 5) + '.' });
  const has = hasPrice(s, price, W); facts.hasPrice = has;
  reasons.push(whyReason(price, has, fold, raise, calls, river), strengthReason(fs, f.board, strong), priceReason(has, fold, alpha, river));
  const which = whichReason(s, fold, raise, calls); if (which) reasons.push(which);
  return { line: facingLine(fold, raise), reasons };
}
