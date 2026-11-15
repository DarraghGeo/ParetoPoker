// The spot on screen written out to paste elsewhere: the board, the line, the chips, the choices, the ranges and the
// betting it was solved with, and the address that opens it in Study.
import { chips as num, seatName } from '../actions.js';
import { dealtSpotUrl } from '../links.js';
import { betLists } from '../setup.js';

const capital = (word) => word[0].toUpperCase() + word.slice(1);

/** Where hero stands and the chips: first to act or after the line, the pot, the call and what is behind. */
function standing(d, config) {
  const line = d.line.map((label, k) => `${k % 2 === 0 ? 'OOP' : 'IP'} ${label}`).join(', ');
  return [
    `Hero: ${seatName(d.seat)}, ${!d.line.length ? `first to act on the ${d.street}` : `on the ${d.street} after ${line}`}`,
    `Pot: ${num(d.pot)}${d.toCall > 0 ? `, to call ${num(d.toCall)}` : ''}, behind ${num(d.behind)} (started at pot ${num(config.pot)}, stacks ${num(config.stack)})`,
  ];
}

/** The betting the spot was solved with, and how. */
function betting(d, config) {
  return [
    `Bet sizes, % of pot: ${betLists(config).map((list) => list.map((b) => Math.round(100 * b)).join(' ')).join(' / ')}`,
    `Raises: ${config.raises.length && config.maxRaises > 0 ? `${config.raises.map((r) => `${r}x`).join(' ')}, ${config.maxRaises} allowed` : 'none'}; all-in ${config.allIn ? 'offered' : 'not offered'}`,
    d.street === 'flop' ? 'Solved lite: these sizes on the flop, one bet size on the turn and river.' : `Solved from the flop (lite), then the ${d.street === 'river' ? 'turn and the river each' : 'turn'} solved again for the ranges that arrive.`,
  ];
}

export function spotText(spot, q, config) {
  const d = spot.decision; const villain = d.seat === 'oop' ? 'ip' : 'oop';
  const before = d.history.map((h) => `${capital(h.street)} ${h.cards.join(' ')}: ${h.actions.map((a) => `${seatName(a.seat)} ${a.label}`).join(', ')}`);
  return [
    `Board: ${d.boardText} (${d.street})`, ...before, ...standing(d, config),
    `Hero's actions: ${d.actions.map((a) => a.label).join(', ')}`, q?.hand ? `Hand: ${q.hand}` : '',
    `Hero's starting range, ${seatName(d.seat)}: ${config[d.seat]} (${Math.round(spot.mine.combos)} combinations reach this decision)`,
    `Villain's starting range, ${seatName(villain)}: ${config[villain]} (${Math.round(spot.his.combos)} combinations reach this decision)`,
    ...betting(d, config),
    new URL(dealtSpotUrl(config, { board: d.boardText, history: d.history, line: d.line }, q?.hand), location.href).href,
  ].filter(Boolean).join('\n');
}
