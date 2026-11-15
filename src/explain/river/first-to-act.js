// First to act: the hand bets, checks, or both, and may sit right at the line between them.
import { betReasons } from './betting.js';
import { checkReasons } from './checking.js';
import { BLUFF } from './terms.js';
import { sayAtTheLine } from './the-line.js';
import { checksOf } from './view.js';

export function firstToAct(view) {
  if (view.betting > 0.1 && view.mainBet >= 0) betReasons(view);
  if (view.check >= 0 && checksOf(view) > 0.1 && view.betting <= 0.1) checkReasons(view);
  if (view.row.equity > BLUFF) sayAtTheLine(view, (gap) => Math.abs(gap) >= 0.4);
}
