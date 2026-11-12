import BitVal from 'poker-bitvaljs';
import { COMBO_A, COMBO_B, NUM_COMBOS } from './cards.js';

const bitval = new BitVal();

/** Pair classes, strongest first. */
export const PAIR = {
  /** Top pair, an overpair, or anything better that uses a hole card. */
  TOP_OR_BETTER: 4,
  /** A hole card paired with a board card below the top one. */
  BOARD_PAIR: 3,
  /** A pocket pair below the top board card and above the bottom one. */
  POCKET_MIDDLE: 2,
  /** A pocket pair below every board card. */
  POCKET_UNDER: 1,
  NONE: 0,
};

/** Draw classes, strongest first. Only on the flop and turn. */
export const DRAW = {
  /** The nut flush draw, or a flush draw with a straight draw. */
  NUT: 3,
  /** A flush draw or an open-ended straight draw (eight outs, double gutshots included). */
  STRONG: 2,
  GUTSHOT: 1,
  NONE: 0,
};

const hasStraight = (ranks) => {
  const withWheel = (ranks << 1) | (ranks >> 12); // the ace also plays low
  return (withWheel & (withWheel >> 1) & (withWheel >> 2) & (withWheel >> 3) & (withWheel >> 4)) !== 0;
};

/**
 * Classifies every combo on a board by what it holds: its pair class and its draw.
 * Only what hole cards add counts: a pair or a draw that is on the board for everyone is not ours.
 *
 * @param {number[]} board 3, 4 or 5 card ids.
 * @param {Float64Array} [only] When given, only combos with weight here are classified.
 * @returns {{ pair: Uint8Array, draw: Uint8Array, highCard: Uint8Array }} Per combo id: a PAIR
 *   value, a DRAW value, and 1 when the hand is ace or king high with no pair and no draw.
 */
export function classifyHands(board, only = null) {
  const pair = new Uint8Array(NUM_COMBOS);
  const draw = new Uint8Array(NUM_COMBOS);
  const highCard = new Uint8Array(NUM_COMBOS);

  const dead = new Uint8Array(52);
  const boardSuits = [0, 0, 0, 0]; // rank mask per suit
  const boardCount = new Uint8Array(13);
  let boardRanks = 0;
  for (const card of board) {
    dead[card] = 1;
    boardSuits[card & 3] |= 1 << (card >> 2);
    boardCount[card >> 2]++;
    boardRanks |= 1 << (card >> 2);
  }
  const top = 31 - Math.clz32(boardRanks);
  const bottom = 31 - Math.clz32(boardRanks & -boardRanks);
  const canDraw = board.length < 5;
  const bits = (x) => { let n = 0; for (; x; x &= x - 1) n++; return n; };

  for (let i = 0; i < NUM_COMBOS; i++) {
    const a = COMBO_A[i];
    const b = COMBO_B[i];
    if (dead[a] || dead[b] || (only && !(only[i] > 0))) continue;
    const ra = a >> 2;
    const rb = b >> 2;
    const suits = [...boardSuits];
    suits[a & 3] |= 1 << ra;
    suits[b & 3] |= 1 << rb;
    const ranks = boardRanks | (1 << ra) | (1 << rb);
    const category = bitval.evaluateSuits(suits[3], suits[2], suits[1], suits[0]) >>> 20;

    // --- What the hole cards make
    const pocket = ra === rb;
    const hitA = boardCount[ra] > 0;
    const hitB = boardCount[rb] > 0;
    if (category >= 4) {
      pair[i] = PAIR.TOP_OR_BETTER; // straight or better: five cards always need a hole card here
    } else if (pocket) {
      if (hitA || ra > top) pair[i] = PAIR.TOP_OR_BETTER; // a set or an overpair
      else pair[i] = ra > bottom ? PAIR.POCKET_MIDDLE : PAIR.POCKET_UNDER;
    } else if (hitA || hitB) {
      const twoPair = hitA && hitB;
      const trips = (hitA && boardCount[ra] >= 2) || (hitB && boardCount[rb] >= 2);
      const best = Math.max(hitA ? ra : -1, hitB ? rb : -1);
      pair[i] = twoPair || trips || best === top ? PAIR.TOP_OR_BETTER : PAIR.BOARD_PAIR;
    }

    // --- What they draw to
    if (canDraw && category < 4) {
      let flush = false;
      let nutFlush = false;
      for (let s = 0; s < 4; s++) {
        if (bits(suits[s]) !== 4 || suits[s] === boardSuits[s]) continue;
        flush = true;
        const ours = suits[s] & ~boardSuits[s];
        // The nut draw holds the highest card of the suit that is not on the board
        let highest = 12;
        while (boardSuits[s] & (1 << highest)) highest--;
        if (ours & (1 << highest)) nutFlush = true;
      }
      // Ranks that would complete a straight which the board does not already give everyone
      let straightOuts = 0;
      for (let r = 0; r < 13; r++) {
        if (ranks & (1 << r)) continue;
        if (hasStraight(ranks | (1 << r)) && !hasStraight(boardRanks | (1 << r))) straightOuts++;
      }
      if (nutFlush || (flush && straightOuts > 0)) draw[i] = DRAW.NUT;
      else if (flush || straightOuts >= 2) draw[i] = DRAW.STRONG;
      else if (straightOuts === 1) draw[i] = DRAW.GUTSHOT;
    }

    if (!pair[i] && !draw[i] && Math.max(ra, rb) >= 11) highCard[i] = 1;
  }
  return { pair, draw, highCard };
}
