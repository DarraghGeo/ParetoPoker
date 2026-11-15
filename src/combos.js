// Hands as the solver numbers them (0 to 1325): a combination's two cards, whether two share a card, and how much of a
// range a hand can face once the combinations sharing one of its cards are out.
export const firstCard = (fs, combo) => fs.COMBO_CARDS[2 * combo];
export const secondCard = (fs, combo) => fs.COMBO_CARDS[2 * combo + 1];
export const cardsOf = (fs, combo) => [firstCard(fs, combo), secondCard(fs, combo)];
/** Whether a combination holds a card. */
export const holds = (fs, combo, card) => firstCard(fs, combo) === card || secondCard(fs, combo) === card;
/** Whether a combination holds any of the cards marked in `taken` (a Uint8Array or Set-like with `has`). */
export const blockedBy = (fs, combo, taken) => (taken.has ? taken.has(firstCard(fs, combo)) || taken.has(secondCard(fs, combo)) : !!(taken[firstCard(fs, combo)] || taken[secondCard(fs, combo)]));

/** A range's weight in all, and on each card. */
export function cardTotals(fs, range, skip = () => false) {
  const perCard = new Float64Array(52); let all = 0;
  for (let c = 0; c < fs.COMBOS; c++) {
    if (!(range[c] > 0) || skip(c)) continue;
    all += range[c]; perCard[firstCard(fs, c)] += range[c]; perCard[secondCard(fs, c)] += range[c];
  }
  return { all, perCard };
}

/** How much of a range each hand can face: all of it but what shares a card with the hand (its own combination counted back once). */
export function facingOf(fs, range) {
  const { all, perCard } = cardTotals(fs, range);
  return (combo) => all - perCard[firstCard(fs, combo)] - perCard[secondCard(fs, combo)] + range[combo];
}
