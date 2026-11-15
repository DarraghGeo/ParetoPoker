// First to act: the sentence that opens the answer, and what he does when the hand checks to him.
import { standingOf } from './hand-words.js';
import { pct } from './terms.js';

export const openingOf = ({ s, row, hand, what }) => `You have ${what}, ${standingOf(s.rows, hand)}: it beats ${pct(row.equity)} of his range.`;
/** What he does after the hand checks, or null when it cannot. */
export const afterCheckOf = ({ row, check }) => (check >= 0 ? row.next[check] : null);
/** How often he bets when checked to, or null when the hand cannot check or he never gets the chance. */
export const facesBetOf = (view) => { const afterCheck = afterCheckOf(view); return afterCheck ? afterCheck.more : null; };
