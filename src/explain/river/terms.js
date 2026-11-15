// The river explanation's shared terms: what counts as a mistake, a bet and a bluff, and how a share is written.

/** An action costing more than this share of the pot is a mistake for the hand. */
export const MISTAKE = 0.005;
export const AGGRESSIVE = new Set(['bet', 'raise', 'allin']);
/** A bluff: a bet that loses to most of what calls, by a hand that would rarely win by checking. */
export const BLUFF = 1 / 3;
export const isBluff = (row, a) => (row.whenCalled[a] ?? row.equity) < 0.5 && row.equity < BLUFF;

export const pct = (x) => `${Math.round(100 * x)}%`;
/** Whether two hands, as card pairs, hold a card in common (a hand with itself does not). */
export const shares = (a, b) => (a === b ? false : !!a && !!b && (a[0] === b[0] || a[0] === b[1] || a[1] === b[0] || a[1] === b[1]));
