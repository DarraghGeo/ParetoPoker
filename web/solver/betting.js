// The betting a street is solved with, from the setup: one list of bet sizes plays on every street; several, one for each
// street from the board's own, so a later street takes the last ones. The solver counts the bet as the first raise.
const listsOf = (config) => (Array.isArray(config.bets[0]) ? config.bets : [config.bets]);

/** The bet sizes for the streets left once the board holds `cards` cards: the last lists, or all of them when they fit. */
export function streetsFrom(config, cards) {
  const lists = listsOf(config); const left = 6 - cards;
  return lists.length > left ? lists.slice(-left) : config.bets;
}

/** The betting as the solver takes it, the bet sizes as the setup gives them. */
export function solverBetting(config) {
  const raises = config.raises.length ? config.maxRaises : 0;
  return {
    betSizes: listsOf(config),
    raiseSizes: raises ? config.raises.map((times) => ({ times })) : undefined,
    maxRaises: 1 + raises,
    allowAllIn: !!config.allIn,
  };
}

/** The betting for a street solved on a board of `cards` cards. */
export const bettingFor = (config, cards) => solverBetting({ ...config, bets: streetsFrom(config, cards) });
