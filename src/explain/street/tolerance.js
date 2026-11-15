/**
 * How far each quoted quantity may be from the truth, by how finely the spot was solved and by
 * how much of the thinner range takes the line. Measured, not assumed: the largest difference
 * found between a solve of that accuracy and two far finer solves by different algorithms, over
 * every hand of the proof battery, times 1.5 (research/proof/tolerance.mjs; PROOF.md has the
 * table). Null: that quantity is not quoted there.
 *
 *   eq, folds: points.   gap, lift, rest, cmp: % of the pot.
 *   gap   the difference in worth between two actions the hand takes
 *   sign  how much worse an action the hand does not take must be, in this solve, before it is called worse
 *   cmp   what a bet is worth when he continues, less what the passive action is worth
 *   lift, rest   a call's gain over folding on the cards that lift the hand, and on the others
 */
export const TOLERANCE = {
  // Lines at least half of each range takes, and (with wider gates) lines a fifth to a half take.
  // Thinner than that, nothing is concluded.
  turn: [
    { upTo: 0.02, lines: [
      { from: 0.5, eq: 1, folds: 1, gap: 1.1, sign: 2, role: 0.25, cmp: 3.5, lift: 0.5, rest: 1.5 },
      { from: 0.2, eq: 4, folds: 2, gap: 2.3, sign: 4, role: null, cmp: 4.2, lift: 2.6, rest: 4.2 },
    ] },
  ],
  // Rivers solve in a moment, so they are held to a finer solve; their mixes are looser all the same
  river: [
    { upTo: 0.01, lines: [
      { from: 0.5, eq: 2, folds: 3, gap: 2.7, sign: 2, role: 0.25, cmp: 7.8, lift: null, rest: null },
      { from: 0.2, eq: 4, folds: 3, gap: 4, sign: 5, role: null, cmp: 10, lift: null, rest: null },
    ] },
  ],
  // The river once a card has come, inside a spot that started on the turn and was solved to 0.02% as a turn spot
  'river after a deal': [
    { upTo: 0.02, lines: [{ from: 0.5, eq: 3, folds: 3, gap: 4, sign: 5, role: 0.25, cmp: 10, lift: null, rest: null }] },
  ],
};
/**
 * Under test, not in use: flop spots at the accuracy a browser reaches. The proof harness tries these
 * beside the table above; they move into it only if they pass.
 */
export const ON_TRIAL = {
  ...TOLERANCE,
  // Flop spots at the accuracy a browser reaches (0.3%): the flop itself, and the turn once a card has come.
  // Gates are twice the largest differences measured on the one flop spot measured in full.
  // (the gate for 'worse' was raised from 3 to 5 after the first seventeen flop spots, where a finer solve reversed a
  // difference of 2.1; the 'extra' flop set was run after that and is the test of these gates as they stand)
  flop: [{ upTo: 0.3, lines: [{ from: 0.5, eq: 1, folds: 2, gap: 2.8, sign: 5, role: 0.25, cmp: 5, lift: 0.8, rest: 1.4 }] }],
  'turn after a deal': [{ upTo: 0.3, lines: [{ from: 0.5, eq: 2, folds: 2, gap: 2.4, sign: 5, role: 0.25, cmp: 3.6, lift: 1, rest: 2 }] }],
};
/** The tolerances that apply: `street` is 'turn' or 'flop' (where the decision is), `exploit` the solve's accuracy in % of the pot. */
export function tolerance(street, exploit, lineReach, table = TOLERANCE) {
  const tier = (table[street] ?? []).find((t) => exploit <= t.upTo * 1.0001);
  return tier?.lines.find((l) => Math.min(...lineReach) >= l.from) ?? null;
}

/** No conclusion passes these gates: only the numbers are said. */
export const NUMBERS_ONLY = { eq: 0, folds: 0, gap: null, sign: null, cmp: null, lift: null, rest: null };
