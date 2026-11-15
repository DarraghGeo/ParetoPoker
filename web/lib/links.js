// The address that opens a spot in Study: the setup, the board, and where in it to open (the actions taken to reach the
// decision, the cards dealt on the way, the hand picked); a spot dealt from a flop is solved there the same way.
import { betLists } from './setup.js';

export function studyUrl(config, board, { line = [], dealt = [], hand = null, lite = false, resolve = false } = {}) {
  const q = new URLSearchParams({
    board: board.replace(/\s+/g, ''), pot: config.pot, stack: config.stack,
    bets: betLists(config).map((list) => list.map((b) => Math.round(100 * b)).join(',')).join('/'),
    raises: config.raises.join(','), max: config.maxRaises, allin: config.allIn ? 1 : 0, oop: config.oop, ip: config.ip,
  });
  const extra = { line: line.join(','), dealt: dealt.join(','), hand: hand ?? '', lite: lite ? '1' : '', resolve: resolve ? '1' : '' };
  for (const [key, value] of Object.entries(extra)) if (value) q.set(key, value);
  return `study.html?${q}`;
}

/** Every action on the way to a decision, in order: the streets before it, then its own. */
export const wholeLine = (at) => [...(at.history ?? []).flatMap((h) => h.actions.map((a) => a.label)), ...(at.line ?? [])];

/** A spot dealt from a flop, as Study opens it: the flop solved lite, the line played, each later street solved again. */
export function dealtSpotUrl(config, at, hand) {
  const cards = String(at.board).match(/[2-9TJQKA][shdc]/g) ?? [];
  if (!at.history && cards.length > 3) return studyUrl(config, at.board, { line: at.line ?? [], hand });
  return studyUrl(config, cards.slice(0, 3).join(''), { line: wholeLine(at), dealt: cards.slice(3), hand, lite: true, resolve: cards.length > 3 });
}
