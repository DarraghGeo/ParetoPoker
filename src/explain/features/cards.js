/** Hand categories from the evaluator, and what a hand's cards make of a board's ranks and suits. */
export const STRAIGHT = 4;
export const FLUSH = 5;
export const STRAIGHT_FLUSH = 8;
const ACE = 12;

export const ranksOf = (fs, cards) => new Set(cards.map((c) => fs.rankOf(c)));
export const topRank = (fs, board) => Math.max(...board.map((c) => fs.rankOf(c)));
export const highRank = (fs, hole) => Math.max(fs.rankOf(hole[0]), fs.rankOf(hole[1]));
/** Hole cards ranked above every card of the board. */
export const overcards = (fs, board, hole) => hole.filter((c) => fs.rankOf(c) > topRank(fs, board)).length;

const suited = (fs, cards, suit) => cards.filter((c) => fs.suitOf(c) === suit).length;
/** Three to a flush with a hole card in it. */
export function backdoorFlush(fs, board, hole) {
  const cards = [...board, ...hole];
  for (let suit = 0; suit < 4; suit++) if (suited(fs, cards, suit) === 3 && suited(fs, hole, suit) >= 1) return true;
  return false;
}

/** Three ranks of some five-rank run, a hole card among them, so that two running cards make a straight (the ace counts low as well as high). */
export function backdoorStraight(fs, board, hole) {
  const all = ranksOf(fs, [...board, ...hole]);
  const onBoard = ranksOf(fs, board);
  for (let low = -1; low <= 8; low++) if (runNeedsTwo(all, onBoard, low)) return true;
  return false;
}

function runNeedsTwo(all, onBoard, low) {
  let have = 0; let shared = 0;
  for (let k = 0; k < 5; k++) {
    const rank = low + k === -1 ? ACE : low + k;
    if (all.has(rank)) have++;
    if (onBoard.has(rank)) shared++;
  }
  return have >= 3 && shared < have;
}
