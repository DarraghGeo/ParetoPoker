// Questions on the ranges themselves, which need no solve: whose range a chart is, whether a hand is in a range, and
// which of two ranges holds more of a rank. Drawn from the preset ranges by position and preflop action.
import { RANKS, cellName, cellSize, pct } from '../cards.js';
import { PRESETS, SEATS } from '../study/presets.js';

export const RANGE_TYPES = ['whose', 'inout', 'card'];
/** In or out: a hand is always in from this weight, never in up to that; between the two gaps it is sometimes. */
const ALWAYS = 0.85; const NEVER = 0.05; const SOMETIMES = [0.15, 0.75];
/** Whose card: under this difference in share the two are close; a difference that could be read either way is not asked. */
const CLOSE = 0.02; const CLEAR = 0.035;
const WORD = { A: 'an ace', K: 'a king', Q: 'a queen', J: 'a jack', T: 'a ten', 9: 'a nine', 8: 'an eight', 7: 'a seven', 6: 'a six', 5: 'a five', 4: 'a four', 3: 'a three', 2: 'a two' };
const any = (list) => list[Math.floor(Math.random() * list.length)];

/** A range text ("AA,AKs:0.5") as chart names and how much of each is held. */
export function weightsOf(text) {
  const held = new Map();
  for (const part of String(text).split(',')) { const [name, w] = part.trim().split(':'); if (name) held.set(name, w === undefined ? 1 : Number(w)); }
  return held;
}

/** The ranges a preset holds, each with who plays it, what it did before the flop, and a line for the action. */
function sidesOf(p) {
  const [first, second] = [p.oop, p.ip].sort((a, b) => SEATS.indexOf(a) - SEATS.indexOf(b));
  const told = { SRP: [`${first} opens`, `${second} calls ${first}'s open`, `${first} raises, ${second} calls`], '3BP': [`${first} calls ${second}'s 3-bet`, `${second} 3-bets ${first}'s open`, `${first} raises, ${second} 3-bets, ${first} calls`] }[p.action];
  const why = { SRP: ['An opening range: pairs, big cards and suited hands, wider the later the seat.', 'A calling range has a hole at the top: its best hands 3-bet, so what is left is suited and connected.'], '3BP': ['The opener called a 3-bet: its very best hands 4-bet, so this is the strong middle of what it opened.', 'A 3-betting range is the top of the deck and a few suited bluffs, with the middle left out.'] }[p.action];
  return [first, second].map((seat, k) => ({ seat, label: told[k], line: told[2], why: why[k], held: weightsOf(seat === p.oop ? p.ranges.oop : p.ranges.ip) }));
}
const POOL = PRESETS.filter((p) => ['SRP', '3BP'].includes(p.action)).map((p) => ({ preset: p, sides: sidesOf(p) }));

/** A range as the chart draws it: one entry a chart cell that is held. */
export function chartHands(held) {
  const hands = [];
  for (let i = 0; i < 13; i++) for (let j = 0; j < 13; j++) {
    const w = held.get(cellName(i, j)) ?? 0; if (!(w > 0)) continue;
    const suits = i === j ? 'sh' : i < j ? 'ss' : 'sd';
    hands.push({ name: `${RANKS[Math.min(i, j)]}${suits[0]}${RANKS[Math.max(i, j)]}${suits[1]}`, w: w * cellSize(i, j) });
  }
  return hands;
}
const combosOf = (held) => { let n = 0; for (let i = 0; i < 13; i++) for (let j = 0; j < 13; j++) n += (held.get(cellName(i, j)) ?? 0) * cellSize(i, j); return n; };
const asked = (q, type) => ({ ...q, type, street: 'preflop', chosen: [], done: false, ok: null });

function whoseQuestion() {
  const { sides } = any(POOL); const side = any(sides); const labels = [side.label];
  for (let tries = 0; labels.length < 4 && tries < 60; tries++) { const other = any(any(POOL).sides).label; if (!labels.includes(other)) labels.push(other); }
  labels.sort(() => Math.random() - 0.5);
  return asked({ text: 'Whose range is this?', options: labels.map((label) => ({ label })), right: [labels.indexOf(side.label)], wide: true, show: { charts: [{ title: 'Range', hands: chartHands(side.held) }] }, why: [`${side.label}: ${Math.round(combosOf(side.held))} combinations.`, side.why] }, 'whose');
}

/** A chart cell to ask about: held always, held sometimes, or not held but next to cells that are. */
function pickCell(held) {
  const cells = []; for (let i = 0; i < 13; i++) for (let j = 0; j < 13; j++) cells.push([i, j, held.get(cellName(i, j)) ?? 0]);
  const near = ([i, j]) => [[i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]].some(([a, b]) => (held.get(cellName(Math.max(0, Math.min(12, a)), Math.max(0, Math.min(12, b)))) ?? 0) >= 0.5);
  const kinds = [cells.filter((c) => c[2] >= ALWAYS), cells.filter((c) => c[2] >= SOMETIMES[0] && c[2] <= SOMETIMES[1]), cells.filter((c) => c[2] <= NEVER && near(c))].filter((list) => list.length);
  return kinds.length ? any(any(kinds)) : null;
}

function inoutQuestion() {
  const side = any(any(POOL).sides); const cell = pickCell(side.held); if (!cell) return null;
  const [i, j, w] = cell; const name = cellName(i, j); const suits = i === j ? 'sh' : i < j ? 'ss' : 'sd';
  const right = w >= ALWAYS ? 0 : w <= NEVER ? 2 : 1;
  const marked = `${RANKS[Math.min(i, j)]}${suits[0]}${RANKS[Math.max(i, j)]}${suits[1]}`;
  return asked({ text: 'Is it in the range?', plain: name, context: side.label, options: [{ label: 'Always or nearly' }, { label: 'Sometimes' }, { label: 'Never' }], right: [right], show: { after: true, charts: [{ title: side.label, hands: chartHands(side.held), marked }] }, why: [right === 0 ? `${side.seat} nearly always holds ${name} here (${pct(w)}%).` : right === 2 ? `${side.seat} never holds ${name} here.` : `${side.seat} holds ${name} here ${pct(w)}% of the time.`, side.why] }, 'inout');
}

/** The share of a range's combinations that hold a rank. */
function shareOf(held, rank) {
  let all = 0, has = 0;
  for (let i = 0; i < 13; i++) for (let j = 0; j < 13; j++) { const w = (held.get(cellName(i, j)) ?? 0) * cellSize(i, j); all += w; if (RANKS[i] === rank || RANKS[j] === rank) has += w; }
  return all > 0 ? has / all : 0;
}

function cardQuestion() {
  for (let tries = 0; tries < 40; tries++) {
    const { sides } = any(POOL); const rank = any(RANKS.split('')); const [a, b] = sides.map((s) => shareOf(s.held, rank)); const d = a - b;
    if (Math.abs(d) >= CLOSE && Math.abs(d) < CLEAR) continue;
    const right = Math.abs(d) < CLOSE ? 1 : d > 0 ? 0 : 2; const who = right === 1 ? null : sides[right === 0 ? 0 : 1].seat;
    return asked({ text: `Who has more hands with ${WORD[rank]} in them, as a share of the range?`, plain: rank, context: sides[0].line, options: [{ label: sides[0].seat }, { label: 'Close' }, { label: sides[1].seat }], right: [right],
      bars: [{ title: `Hands with ${WORD[rank]}`, rows: [[sides[0].seat, a], [sides[1].seat, b]], decides: false, scale: 2.5 }], show: { after: true, charts: sides.map((s, k) => ({ title: s.seat, hands: chartHands(s.held), villain: k === 1 })) },
      why: [`${pct(a)}% of ${sides[0].seat}'s range and ${pct(b)}% of ${sides[1].seat}'s.${who ? ` ${who} has more of them.` : ' About the same share of each.'}`, 'When this rank is the top card on the board, this is who has more top pair.'] }, 'card');
  }
  return null;
}

const BUILD = { whose: whoseQuestion, inout: inoutQuestion, card: cardQuestion };
/** A question on the ranges, of a kind chosen in settings; null when none is. */
export function rangeAsk(prefs) {
  const on = RANGE_TYPES.filter((t) => prefs.types[t]);
  for (let tries = 0; on.length && tries < 4; tries++) { const q = BUILD[any(on)](); if (q) return q; }
  return null;
}
