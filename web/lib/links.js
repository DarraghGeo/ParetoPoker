// The address that opens a spot in Study: the setup, the board, and where in it to open (the actions taken to reach the
// decision, the cards dealt on the way, the hand picked).
import { betLists } from './setup.js';

export function studyUrl(config, board, { line = [], dealt = [], hand = null, lite = false, resolve = false } = {}) {
  const q = new URLSearchParams({
    board: board.replace(/\s+/g, ''), pot: config.pot, stack: config.stack,
    bets: betLists(config).map((list) => list.map((b) => Math.round(100 * b)).join(',')).join('/'),
    raises: config.raises.join(','), max: config.maxRaises, allin: config.allIn ? 1 : 0, oop: config.oop, ip: config.ip,
  });
  const extra = { line: line.join(','), dealt: dealt.join(','), hand: hand ?? '', lite: lite ? '1' : '', resolve: resolve ? '1' : '' };
  for (const [key, value] of Object.entries(extra)) if (value) q.set(key, value);
  return `#/study?${q}`;
}

