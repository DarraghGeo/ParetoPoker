// The betting a street is solved with, from the setup: one list of bet sizes plays on every street; several, the last
// ones are the later streets. The solver counts the bet as the first raise.
export function bettingFor(config, cards) {
  const lists = Array.isArray(config.bets[0]) ? config.bets : [config.bets];
  const left = 6 - cards; const raises = config.raises.length ? config.maxRaises : 0;
  return {
    betSizes: lists.length > left ? lists.slice(-left) : lists,
    raiseSizes: raises ? config.raises.map((times) => ({ times })) : undefined,
    maxRaises: 1 + raises,
    allowAllIn: !!config.allIn,
  };
}
