/**
 * Test spots: several pairs of ranges, stack depths and boards, split into a set for tuning and
 * a set held out to check that a tuning carries over. A spot is one game tree:
 * `{ name, pair, oopRange, ipRange, board, pot, stack, sizes }`.
 */

/** Pairs of ranges: out of position first, then in position. */
export const PAIRS = {
  /** The pair most early results used: a mid-strength defender against a wide in-position range. */
  A: {
    oopRange: '66+,A8s+,A5s-A4s,AJo+,K9s+,KQo,QTs+,JTs,96s+,85s+,75s+,65s,54s',
    ipRange: 'QQ-22,AQs-A2s,ATo+,K5s+,KJo+,Q8s+,J8s+,T7s+,96s+,86s+,75s+,64s+,53s+',
  },
  /** A single-raised pot: the big blind's defence against a button open. */
  B: {
    oopRange: '99-22,A9s-A2s,K2s+,Q5s+,J7s+,T7s+,96s+,86s+,75s+,64s+,54s,AJo-A2o,K9o+,Q9o+,J9o+,T9o',
    ipRange: '22+,A2s+,K5s+,Q8s+,J8s+,T8s+,97s+,87s,76s,65s,A8o+,KTo+,QTo+,JTo',
  },
  /** A 3-bet pot: a strong, narrow 3-bettor out of position against a condensed caller. */
  C: {
    oopRange: 'TT+,AQs+,A5s-A4s,KQs,KJs,QJs,JTs,T9s,AKo,AQo',
    ipRange: 'JJ-55,AQs-ATs,KQs-KTs,QJs,QTs,JTs,T9s,98s,87s,76s,AQo',
  },
  /** Blind against blind: two wide ranges. */
  D: {
    oopRange: '22+,A2s+,K2s+,Q4s+,J6s+,T6s+,96s+,85s+,75s+,64s+,54s,A2o+,K7o+,Q8o+,J8o+,T8o+,98o',
    ipRange: '99-22,A9s-A2s,K2s+,Q2s+,J4s+,T6s+,95s+,85s+,74s+,64s+,53s+,A9o-A2o,K5o+,Q7o+,J8o+,T8o+,97o+,87o',
  },
};

const SIZES = { bet: '33%,75%,150%', raise: '2.5x' };
const BOARDS = {
  rivers: {
    tune: ['Td9d6hQc7s', 'Ks7h2d5c9s', 'AhJh8c3d2h', '8s8d4c2hKd', 'QsJd6c3h2s', 'Ac9c5d5hTs'],
    held: ['7h6h5c2dKs', 'KdQd4s9h3c', 'Jc8c3c6dAh', 'Ts7s4d2hQh'],
  },
  turns: {
    tune: ['Ks7h2d5c', 'JsTs4h8d'],
    held: ['Ah8c3d6s'],
  },
};
/** Stack behind as a multiple of the pot. */
const DEPTHS = { rivers: [0.75, 2, 5], turns: [1.5, 4] };

function build(street, part) {
  const out = [];
  for (const [pair, ranges] of Object.entries(PAIRS)) {
    for (const board of BOARDS[street][part]) {
      for (const depth of DEPTHS[street]) {
        out.push({ name: `${pair} ${board} ${depth}x`, pair, ...ranges, board, pot: 100, stack: Math.round(100 * depth), depth, sizes: SIZES });
      }
    }
  }
  return out;
}

/**
 * - `rivers-tune` (72 trees) and `rivers-held` (48): every pair, three depths.
 * - `turns-tune` (16) and `turns-held` (8): every pair, two depths.
 */
export const SPOTS = {
  'rivers-tune': build('rivers', 'tune'),
  'rivers-held': build('rivers', 'held'),
  'turns-tune': build('turns', 'tune'),
  'turns-held': build('turns', 'held'),
};

/** The game SolverMatch and SolverBridge take, for a spot. */
export function gameOf(spot) {
  const street = { oop: spot.sizes, ip: spot.sizes };
  return { oopRange: spot.oopRange, ipRange: spot.ipRange, board: spot.board, pot: spot.pot, stack: spot.stack, betSizes: { flop: street, turn: street, river: street } };
}

/** Runs `job(item)` over `items`, `width` at a time, and returns the results in order. */
export async function pool(items, job, width = 4) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(width, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await job(items[index], index);
    }
  }));
  return results;
}
