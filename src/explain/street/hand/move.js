// One move ahead: why the action the hand takes comes out best, against what he actually does, with his hands named.
import { oneMove } from '../one-move.js';
import { percent } from '../words.js';
import { aheadOf } from './ahead.js';
import { foldMove, callMove } from './move-call.js';
import { checkMove } from './move-check.js';
import { betMove } from './move-bet.js';

/** A check that ends the street: it keeps what the hand has. */
const KEEPS = 'Checking keeps what the hand has: it sees the next card or the showdown with its equity intact.';
const checkBehind = (k) => ({ id: 'move', text: KEEPS, detail: `${percent(k.x.equity)} equity against his range here.${k.versus}` });

export function moveReason(h) {
  const mv = oneMove(h.s, h.m.combo); const top = h.taken[0];
  if (!mv || top == null) return null;
  const k = aheadOf(h, mv, top); const { x } = k;
  if (x.kind === 'fold') return foldMove(k);
  if (x.kind === 'call' && x.equity != null) return callMove(k);
  if (x.kind === 'check' && !x.parts.length && x.equity != null) return checkBehind(k);
  if (x.parts.length) return x.kind === 'check' ? checkMove(k) : betMove(k);
  return null;
}
