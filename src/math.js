/**
 * Indifference math for a single wager. Every function is pure and works in chips.
 *
 * A wager risks `risk` chips to win the `reward` already in the middle. A bluff with no equity
 * breaks even when the opponent folds `alpha` of the time, so the opponent has to continue
 * (call or raise) with at least `mdf` of their range to stop any two cards from profiting.
 */

/** Fold frequency at which a zero-equity bluff of `risk` into `reward` breaks even. */
export function alpha(risk, reward) {
  return risk <= 0 ? 0 : risk / (risk + reward);
}

/** Minimum defence frequency against a wager of `risk` into `reward`. */
export function mdf(risk, reward) {
  return 1 - alpha(risk, reward);
}

/** Equity a call of `toCall` needs when `pot` (including the bet faced) is in the middle. */
export function potOdds(toCall, pot) {
  return toCall <= 0 ? 0 : toCall / (pot + toCall);
}

/**
 * The pot fraction to bet on each of `streets` remaining streets so that the last bet is exactly
 * all-in. This is the sizing a polarized range prefers: it wins the most from bluff catchers.
 */
export function geometricFraction(pot, stack, streets) {
  if (stack <= 0 || pot <= 0 || streets <= 0) return 0;
  return (Math.pow((pot + 2 * stack) / pot, 1 / streets) - 1) / 2;
}

/** Streets still to be dealt after each street. */
export const STREETS_AFTER = { flop: 2, turn: 1, river: 0 };

/**
 * Share of a betting range that is value once the bettor can keep betting on later streets.
 *
 * On the river a balanced range holds `1 - potOdds` value. Earlier, a bluff that is called gets
 * to bluff again, so each later bet of pot fraction `s` multiplies the value share by
 * `(1 + s) / (1 + 2s)`. `potAfterCall` and `stackBehind` describe the spot once the current wager
 * has been called; `barrel` is the pot fraction planned for each later street.
 */
export function futureValueFactor(potAfterCall, stackBehind, streetsAfter, barrel) {
  let pot = potAfterCall;
  let stack = stackBehind;
  let factor = 1;
  for (let i = 0; i < streetsAfter && stack > 0 && pot > 0; i++) {
    const fraction = barrel === 'geometric' ? geometricFraction(pot, stack, streetsAfter - i) : barrel;
    const bet = Math.min(fraction * pot, stack);
    if (bet <= 0) break;
    factor *= (pot + bet) / (pot + 2 * bet);
    pot += 2 * bet;
    stack -= bet;
  }
  return factor;
}
