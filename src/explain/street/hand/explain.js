/**
 * The explanation of one hand at a flop, turn or river decision: what it does and why, in plain words. Each reason has
 * its `text`, and where numbers stand behind it a `detail` that carries them. Conclusions are drawn only inside the
 * proven gates; `silent` says why nothing more is said when the decision is not one the proof covers.
 */
import { claims, RARE, TAKES } from '../claims.js';
import { oneMove } from '../one-move.js';
import { NUMBERS_ONLY } from '../tolerance.js';
import { describe } from '../hand-words.js';
import { percent, capitalize } from '../words.js';
import { actionLabel, answerLine } from './answer.js';
import { typeReason } from './type.js';
import { blockersReason } from './blockers.js';
import { moveReason } from './move.js';
import { twinReason, worthReason } from './twin.js';
import { roleReason } from './role.js';
import { sameReasons, worseReasons } from './mixes.js';

const UNTRAINED = 'This line is taken too rarely for the solution to be settled on it, so nothing more is said.';
const UNPROVEN = 'These are this solution\'s own numbers. Conclusions are drawn only where they have been proven to carry over.';

/** The numbers behind the first line: on the river equity is simply how much of his range the hand beats, and a bet names its own price. */
function firstDetail({ s, m, facing, river }) {
  const board = s.f.board.length;
  const street = board === 3 ? 'the turn and river still to come' : board === 4 ? 'the river still to come' : 'no cards to come';
  if (!river) return `With ${street} it has ${percent(m.equity)} equity against the range he has here.`;
  const beats = `It beats ${percent(m.equity)} of the range he has here.`;
  if (!facing) return beats;
  const price = percent(s.toCall / (s.pot + s.toCall));
  return `${beats} He has bet ${Math.round(s.toCall)} into ${Math.round(s.pot - s.toCall)}, so a call has to win ${price} of the time.`;
}

/** Everything the reasons read: the measured hand, its claims, its actions named, and the ones it takes, most often first. */
function handContext(s, m, T) {
  const facing = s.toCall > 0;
  const taken = m.actions.map((a, i) => i).filter((i) => m.actions[i].sigma >= TAKES).sort((x, y) => m.actions[y].sigma - m.actions[x].sigma);
  return { s, m, mv: oneMove(s, m.combo), made: claims(s, m, T), label: actionLabel(m), facing, river: s.f.board.length === 5, taken, what: describe(m.features) };
}

/** Every reason, in the order they are said. */
function reasonsFor(h) {
  const before = [typeReason(h), blockersReason(h), moveReason(h)];
  const draws = h.river ? [] : [twinReason(h), worthReason(h)];
  return [...before, ...draws, roleReason(h), ...sameReasons(h), ...worseReasons(h)].filter(Boolean);
}

/** A sentence's first word, and each word after a full stop that starts one, in capitals. */
const SENTENCE_START = /([.:] )(the |a |he |it |checking|calling|folding|raising|betting|going)/g;
const capitalizeDetail = (t) => capitalize(t).replace(SENTENCE_START, (_, p1, w) => (p1 === ': ' ? p1 + w : p1 + capitalize(w)));

export function explainStreet(s, m, T) {
  if (!m) return null;
  const strategy = m.actions.map((a) => a.sigma);
  // Where conclusions are not proven (a thinner line, a coarser solve), the numbers of this solution are still its numbers.
  // Where the line is hardly ever taken the solution was never trained, and nothing is said.
  if (!T && (Math.min(...s.lineReach) < RARE || m.equity == null)) {
    return { name: m.name, strategy, line: `You have ${describe(m.features)}.`, detail: null, reasons: [], claims: [], silent: UNTRAINED };
  }
  const h = handContext(s, m, T || NUMBERS_ONLY);
  const reasons = reasonsFor(h);
  for (const r of reasons) { r.text = capitalize(r.text); if (r.detail) r.detail = capitalizeDetail(r.detail); }
  return { name: m.name, strategy, line: answerLine(h), detail: firstDetail(h), reasons, claims: h.made, silent: T ? null : UNPROVEN };
}
