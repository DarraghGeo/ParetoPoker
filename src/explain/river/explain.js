// The reasons for one hand: its answer in a sentence or two, then the paragraphs that follow it.
import { sayCost } from './cost.js';
import { facingBet } from './facing.js';
import { firstToAct } from './first-to-act.js';
import { saySameStrength } from './same-strength.js';
import { handView } from './view.js';

/**
 * @param {ReturnType<typeof import('./survey.js').survey>} s
 * @param {string} name The hand, as the decision names it.
 * @returns {{ name: string, strategy: number[], status: 'forced'|'optional'|'unknown', equity: number, line: string, reasons: { id: string, text: string }[] }}
 *   `line` is the answer in a sentence or two; `reasons` are the paragraphs that follow it.
 */
export function explain(s, name) {
  const row = s.byName.get(name);
  if (!row) return null;
  const view = handView(s, row, name);
  if (s.facing) facingBet(view); else firstToAct(view);
  const status = sayCost(view);
  saySameStrength(view);
  if (!view.line) { view.line = view.reasons[0]?.text ?? ''; view.reasons.shift(); }
  return { name, strategy: row.hand.strategy, status, equity: row.equity, line: view.line, reasons: view.reasons };
}
