// The spot on screen written out to paste elsewhere: the board, the line, the chips, what the range and the hand picked
// do, the ranges and the betting, and the address that opens it in Study.
import { isNeutral } from '../../../src/warp/reshape.js';
import { chips as num, seatName } from '../actions.js';
import { pct } from '../cards.js';
import { studyUrl } from '../links.js';
import { betLists } from '../setup.js';
import { trail } from './line.js';
import { boardCards, conf, version } from './versions.svelte.js';

const held = (list) => Math.round(list.reduce((t, h) => t + h.weight, 0));
const mixText = (d, list) => d.actions.map((a, k) => (list[k] > 0.004 ? `${a.label} ${pct(list[k])}%` : '')).filter(Boolean).join(', ');

/** A starting range as given, or (re-solved streets) as it arrives. */
function rangeText(v, side) {
  if (typeof v[side] !== 'string') return 'as it arrives at this street';
  return `${v[side]}${isNeutral(v.dials?.[side]) ? '' : ' (reshaped in the editor)'}`;
}

/** The decision: the board, who acts after what, the chips, the actions and what is played. */
function decisionRows(game, c, path, dealt) {
  const d = game.decision; const here = game.nodes[game.node]; const row = game.survey?.byName.get(game.hand);
  const told = path.map((p) => (p.deal != null ? `dealt ${p.card ?? '?'}` : `${seatName(p.seat)} ${p.label}`));
  return [
    `Board: ${[...boardCards(c.board), ...dealt].join(' ')} (${d.street})`,
    `To act: ${seatName(d.seat)}, ${told.length ? `after ${told.join(', ')}` : 'first to act'}`,
    `Pot: ${num(d.pot)}${d.toCall > 0 ? `, to call ${num(d.toCall)}` : ''}, behind ${num(c.stack - here.invested[d.seat === 'oop' ? 0 : 1])} (started at pot ${num(c.pot)}, stacks ${num(c.stack)})`,
    `Actions: ${d.actions.map((a) => a.label).join(', ')}`,
    `The range plays: ${mixText(d, game.survey.mix)}`,
    row ? `Hand: ${row.hand.name}, which plays ${mixText(d, row.hand.strategy)}` : '',
  ];
}

/** The ranges, the betting and how finely it was solved. */
function setupRows(game, c, v) {
  const d = game.decision; const him = d.seat === 'oop' ? 'ip' : 'oop';
  return [
    `${seatName(d.seat)}'s starting range: ${rangeText(v, d.seat)} (${held(d.hands)} combinations reach this decision)`,
    `${seatName(him)}'s starting range: ${rangeText(v, him)} (${held(d.villain)} combinations reach this decision)`,
    `Bet sizes, % of pot: ${betLists(c).map((list) => list.map((b) => Math.round(100 * b)).join(' ')).join(' / ')}`,
    `Raises: ${c.raises.length && c.maxRaises > 0 ? `${c.raises.map((r) => `${r}x`).join(' ')}, ${c.maxRaises} allowed` : 'none'}; all-in ${c.allIn ? 'offered' : 'not offered'}`,
    `Solved ${c.lite ? 'lite (these sizes on the first street, one bet size after it), ' : ''}to ${game.status.replace('lite ', '')} of the pot`,
  ];
}

/** The address that opens the spot here: only for ranges typed or painted, unchanged by the editor, on the spot's own board. */
function linkRow(game, c, v, path, dealt) {
  if (typeof v.oop !== 'string' || typeof v.ip !== 'string' || !isNeutral(v.dials?.oop) || !isNeutral(v.dials?.ip) || v.base) return '';
  const labels = path.filter((p) => p.deal == null).map((p) => p.label);
  const hand = game.survey?.byName.get(game.hand)?.hand.name ?? null;
  return new URL(studyUrl({ ...c, oop: v.oop, ip: v.ip }, c.board, { line: labels, dealt, hand, lite: !!c.lite }), location.href).href;
}

export function spotText(game) {
  if (!game.decision || !game.nodes) return '';
  const c = conf(game); const v = version(game);
  const path = trail(game.nodes, game.node, game.dealt); const dealt = game.dealt.slice(0, game.nodes[game.node].round);
  return [...decisionRows(game, c, path, dealt), ...setupRows(game, c, v), linkRow(game, c, v, path, dealt)].filter(Boolean).join('\n');
}
