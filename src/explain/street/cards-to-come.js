// A hand's equity and the cards still to come: how it stands now and what the cards to come add, and how it spreads
// over the next card. All counted by poker-bitvaljs (solver/equity.js).
import { bothEquities, equityByCard } from '../../solver/equity.js';

/**
 * A hand's equity in two parts, as poker-extval names them. `now`: its equity if no more cards were dealt (how much of
 * his range it beats as the board stands). `draw`: the rest, equity less that; negative when the cards to come hurt
 * more than they help, as for an overpair on a wet board. Null on the river. `eq`: the equities, if already worked out.
 */
export function drawParts(fs, f, eq = null) {
  if (f.board.length === 5) return null;
  const equity = eq ?? bothEquities(fs, f.board, f.mine, f.his)[0];
  const now = bothEquities(fs, f.board, f.mine, f.his, f.board.length)[0];
  return { now, draw: now.map((x, c) => equity[c] - x) };
}

/** Every card that can come next, and each hand's equity once it has: how a hand's strength is spread over the next street. */
export function nextCards(fs, f) {
  return f.board.length === 5 ? null : equityByCard(fs, f.board, f.mine, f.his);
}
