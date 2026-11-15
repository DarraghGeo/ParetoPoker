/**
 * The range as a whole at a decision: what it does, why, and what would change it. Read from the solution and said the
 * way a coach would, with hands for examples. Returns { line, reasons: [{ id, text, detail }], facts } (`facts`: the
 * numbers behind it, for the tests).
 *
 * The why is the one-move rule added up over the range: for each hand, what a bet is worth (he folds, he calls, he
 * raises) against what a check is worth (he checks behind, he bets). The "what would change it" is the same count with
 * one thing about his play taken away, to show what that thing is doing.
 */
import { capitalize } from '../words.js';
import { strongHands } from './strength.js';
import { explainActing } from './acting.js';
import { explainFacing } from './facing.js';

export function explainRange(s) {
  const { f } = s; if (!s.solution) return null;
  const W = f.mine.reduce((t, w) => t + (w > 0 ? w : 0), 0); if (!(W > 0)) return null;
  const kinds = f.node.edges.map((e) => e.kind); const freq = s.actions.map((a) => a.freq);
  const share = (pick) => freq.reduce((t, x, a) => t + (pick(kinds[a], a) ? x : 0), 0);
  const strong = strongHands(s);
  const facts = { strongMine: strong.mine.share, strongHis: strong.his.share, equity: strong.ahead };
  const r = { s, kinds, freq, share, W, strong, facts, river: f.board.length === 5 };
  const { line, reasons } = s.toCall > 0 ? explainFacing(r) : explainActing(r);
  for (const reason of reasons) { reason.text = capitalize(reason.text); if (reason.detail) reason.detail = capitalize(reason.detail); }
  return { line, reasons, facts };
}
