// The hand on the table as text, to paste somewhere else (a coach, a chat): who sat where with which ranges, the cards,
// every action with its chips, and how it ended.
import { chips } from '../actions.js';
import { presetOf } from '../study/presets.js';

const SEAT = { oop: 'out of position', ip: 'in position' };
const other = (seat) => (seat === 'oop' ? 'ip' : 'oop');
const signed = (x) => `${x > 0 ? '+' : x < 0 ? '-' : ''}${chips(Math.abs(x))}`;
const STREET = { flop: 'Flop', turn: 'Turn', river: 'River' };

/** An action in words, `put` being what its player had in on the street before it: "Hero bets 2.1", "Villain raises to 7.5". */
function said(a, put) {
  const who = a.who === 'hero' ? 'Hero' : 'Villain'; const to = chips(put + a.add);
  const what = { fold: 'folds', check: 'checks', call: `calls ${chips(a.add)}`, bet: `bets ${chips(a.add)}`, raise: `raises to ${to}`, allin: `goes all-in for ${to}` };
  return `${who} ${what[a.kind] ?? a.label}`;
}
/** A street's actions in words. */
function told(actions) {
  const put = { hero: 0, villain: 0 };
  return actions.map((a) => { const text = said(a, put[a.who]); put[a.who] += a.add ?? 0; return text; }).join(', ');
}

/** Who a seat is: its position or player type where the ranges are a preset's. */
export function seatNames(config) {
  const p = presetOf(String(config.oop).trim(), String(config.ip).trim());
  return { oop: p?.oop ?? 'OOP', ip: p?.ip ?? 'IP', line: p?.line ?? '' };
}

export function handText(st, config) {
  if (!st) return '';
  const names = seatNames(config); const villain = other(st.seat); let board = [];
  const streets = st.history.map((h) => { board = [...board, h.cards]; return `${STREET[h.street] ?? h.street} [${board.join(' ')}] pot ${chips(h.pot)}: ${h.actions.length ? told(h.actions) : 'no betting'}`; });
  const end = st.result ? [`Result: ${st.result.how.replace(/^You\b/, 'Hero')}${st.result.mine ? ` (Hero ${st.result.mine}, Villain ${st.result.his})` : ''}. Hero ${signed(st.result.net)} from the flop on.`] : ['(The hand is still being played.)'];
  return [
    `Pareto hand ${st.id}: heads-up no-limit hold'em, played from the flop. Chips are big blinds.`,
    names.line ? `Before the flop: ${names.line}.` : 'Before the flop: ranges set by hand (below).',
    `Pot ${chips(config.pot)} on the flop, ${chips(st.stack ?? config.stack)} behind each.`,
    `Hero: ${names[st.seat]}, ${SEAT[st.seat]}, holds ${st.hero}.`,
    `Villain: ${names[villain]}, ${SEAT[villain]}${st.villain ? `, shows ${st.villain}` : ''}. He plays a solver's strategy for his range.`,
    '', ...streets, ...end, '',
    `Hero's range: ${config[st.seat]}`, `Villain's range: ${config[villain]}`, '',
    'Please review my play street by street: what I did well, where I lost value, and what I should have considered.',
  ].join('\n');
}
