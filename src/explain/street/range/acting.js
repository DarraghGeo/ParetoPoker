// The range first to act: how much of it bets, what a bet meets, which hands bet and which check, and what a check meets.
import { equityVs } from '../../../solver/flopsolve.js';
import { study } from '../study.js';
import { groupsOf, sayGroups } from '../groups.js';
import { percent, often, howMuch, isWager } from '../words.js';
import { takingRange, answerOf, groupShares, betName } from './common.js';
import { strengthReason } from './strength.js';

/** The bet the range makes most, and whether it is the smallest or the largest size. */
function mainBet(kinds, freq) {
  const bets = kinds.map((k, a) => (isWager(k) ? a : -1)).filter((a) => a >= 0);
  const main = bets.length ? bets.reduce((b, a) => (freq[a] > freq[b] ? a : b)) : -1;
  return { main, small: bets.length > 1 && main === bets[0], big: bets.length > 1 && main === bets[bets.length - 1] };
}

function actingLine(bet, { small, big }) {
  if (bet >= 0.8) return `You bet almost your whole range here${small ? ', mostly the small size' : big ? ', mostly the big size' : ''}.`;
  if (bet <= 0.2) return 'You check almost your whole range here.';
  if (bet >= 0.6) return `You bet most of your range here${small ? ', mostly small' : big ? ', mostly big' : ''}, and check the rest.`;
  return bet <= 0.4 ? 'You check most of your range here, and bet the rest.' : 'You bet about half your range here and check the other half.';
}

/** Where the range stands against the hands that call: how much of it has half or more of the equity against them. */
function aheadOf(fs, f, callRange) {
  const mask = new Float64Array(fs.COMBOS); for (let c = 0; c < fs.COMBOS; c++) if (f.mine[c] > 0) mask[c] = 1;
  const eCall = equityVs(fs, f.board, mask, callRange); let ahead = 0, w = 0;
  for (let c = 0; c < fs.COMBOS; c++) if (f.mine[c] > 0 && !Number.isNaN(eCall[c])) { w += f.mine[c]; if (eCall[c] >= 0.5) ahead += f.mine[c]; }
  return w > 0 ? ahead / w : 0;
}

/** What the main bet meets: his folds, raises and calls, the price the bet lays, and how much of the range is ahead of his calls. */
function betAnswers(s, main) {
  const { fs, f } = s; const node = f.node; const child = f.nodes[node.edges[main].child];
  if (child.kind !== 'decision') return null;
  const s2 = study(fs, s.solution, f.nodes, node.edges[main].child, s.dealt ?? []); if (!s2) return null;
  const fo = answerOf(f.board, s2, (k) => k === 'fold'); const ra = answerOf(f.board, s2, isWager); const ca = answerOf(f.board, s2, (k) => k === 'call');
  const size = (child.invested[f.me] - node.invested[f.me]) / node.pot; const price = size / (1 + size);
  return { fo, ra, ca, price, aheadOfCalls: aheadOf(fs, f, ca.range) };
}

const enoughFor = (folds, price) => (folds >= price + 0.04 ? 'more than a bet of that size needs'
  : folds <= price - 0.04 ? 'less than a bet of that size needs to pay with nothing behind it' : 'about what a bet of that size needs');
const whyHead = (bet) => (bet >= 0.6 ? 'Why so much betting: ' : bet <= 0.4 ? 'Why so little betting: ' : 'Why the split: ');

/** Why: what a bet meets, for the range as a whole. */
function whyReason(act, bet, { fo, ra, ca, price, aheadOfCalls }) {
  const seen = new Set();
  const foldBit = `he ${often(fo.share, 'folds')}${fo.groups.length && fo.share >= 0.05 ? ` (${sayGroups(fo.groups, 2, 0.12, seen)})` : ''}`;
  const callers = ca.groups.length ? sayGroups(ca.groups, 2, 0.12, seen) : null;
  const callBit = callers ? `He calls with ${callers}, and ${howMuch(aheadOfCalls)} of your range is ahead of those hands.` : '';
  const raisers = ra.share >= 0.08 && ra.groups.length ? sayGroups(ra.groups, 2, 0.12, seen) : null;
  const raiseBit = raisers ? ` He raises ${ra.share >= 0.2 ? 'a lot' : 'now and then'}, with ${raisers}.` : '';
  const detail = `To ${act} he folds ${percent(fo.share)}, calls ${percent(ca.share)} and raises ${percent(ra.share)}. `
    + `A bet of that size breaks even as a pure bluff when he folds ${percent(price)}. ${percent(aheadOfCalls)} of your range has 50% or more against the ` +
      `hands that call.`;
  return { id: 'why', text: `${whyHead(bet)}against ${act} ${foldBit}, ${enoughFor(fo.share, price)}. ${callBit}${raiseBit}`.trim(), detail };
}

/** Which hands bet, which check. */
function whichReason(s, bet) {
  if (!(bet > 0.08 && bet < 0.92)) return null;
  const board = s.f.board; const gb = groupsOf(s.fs, board, takingRange(s, isWager)); const gx = groupsOf(s.fs, board, takingRange(s, (k) => k === 'check'));
  if (!(gb.length && gx.length)) return null;
  return { id: 'which', text: `The bets are mostly ${sayGroups(gb, 3)}. The checks are mostly ${sayGroups(gx, 3)}.`,
    detail: `Bets: ${groupShares(gb, 4)}. Checks: ${groupShares(gx, 4)}.` };
}

function afterText(stab, g) {
  const his = g.length ? `, with ${sayGroups(g)}` : '';
  if (stab >= 0.6) return `When you check he ${often(stab, 'bets')}${his}: a check is not a free card, and the hands you check have to be ready for it.`;
  if (stab <= 0.3) return `When you check he ${often(1 - stab, 'checks')} back, so a check usually sees the next card for nothing.`;
  return `When you check he bets about ${stab >= 0.45 ? 'half' : 'a third of'} the time${his}.`;
}

/** What he does when checked to. */
function afterReason(s, kinds, freq, facts) {
  const { fs, f } = s; const xi = kinds.indexOf('check');
  if (!(xi >= 0 && f.nodes[f.node.edges[xi].child].kind === 'decision' && freq[xi] >= 0.15)) return null;
  const s3 = study(fs, s.solution, f.nodes, f.node.edges[xi].child, s.dealt ?? []); if (!s3) return null;
  const stab = s3.actions.reduce((t, a) => t + (isWager(a.kind) ? a.freq : 0), 0); const g = groupsOf(fs, f.board, takingRange(s3, isWager)); facts.stab = stab;
  return { id: 'after', text: afterText(stab, g), detail: `After your check he bets ${percent(stab)} of the time.` };
}

/** The decision as explainRange reads it ({ s, kinds, freq, share, strong, facts }). Returns the line and its reasons. */
export function explainActing({ s, kinds, freq, share, strong, facts }) {
  const bet = share(isWager); const sizes = mainBet(kinds, freq); facts.bet = bet; const reasons = [];
  const answers = sizes.main >= 0 ? betAnswers(s, sizes.main) : null;
  if (answers) {
    const { fo, ra, ca, price, aheadOfCalls } = answers; Object.assign(facts, { folds: fo.share, calls: ca.share, raises: ra.share, price, aheadOfCalls });
    reasons.push(whyReason(betName(s.f.node.edges[sizes.main]), bet, answers));
  }
  reasons.push(strengthReason(s.fs, s.f.board, strong));
  for (const reason of [whichReason(s, bet), afterReason(s, kinds, freq, facts)]) if (reason) reasons.push(reason);
  return { line: actingLine(bet, sizes), reasons };
}
