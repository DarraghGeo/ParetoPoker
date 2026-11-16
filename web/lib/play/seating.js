// Who sits at Play's table: live player types or online positions, several of each allowed, so that hands rotate among
// every pairing chosen; or the ranges set up in Study. Kept for the next visit with the bet sizes.
import { savedSetup } from '../setup.js';
import { keep, load } from '../storage.js';
import { ACTIONS, ALL, SEATS, TYPES } from '../study/presets.js';

const KEY = 'pareto-table';
const MIB = 2 ** 20;
/** A phone: a small touch screen, where a web app is closed without warning once it holds too much. */
export const PHONE = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches && Math.min(globalThis.screen?.width ?? 999, globalThis.screen?.height ?? 999) <= 500;
/** How much the hands solved ahead may hold together: a phone keeps to a few hundred megabytes. */
export const BUDGET = (PHONE ? 260 : 1024) * MIB;
const FAST = [[0.33], [0.33], [0.75]];
export const POOLS = [['live', 'Live'], ['online', 'Online'], ['own', "Study's ranges"]];
export const TYPE_NAMES = TYPES.map(([name]) => name);
export const ONLINE_ACTIONS = ACTIONS.filter(([key]) => key !== 'Live');

/** The seating as last chosen, or a first one: a recreational caller against a regular, one bet size a street. */
export function loadSeating() {
  const first = { pool: 'live', live: { oop: ['Rec'], ip: ['Reg'] }, online: { actions: ['SRP'], oop: ['BB'], ip: ['BU'] }, bets: FAST };
  const saved = load(KEY); return saved?.pool ? { ...first, ...saved } : first;
}
export const keepSeating = (seating) => keep(KEY, seating);

/** The seats an online choice of actions offers on a side, in table order. */
export const seatsFor = (actions, side) => SEATS.filter((seat) => ALL.some((p) => actions.includes(p.action) && p[side] === seat));

/** Who raised last before the flop in a preset, by seat: the name its line starts with (nobody in a limped pot). */
const raiserOf = (p) => (/limps/.test(p.line) ? null : p.action === 'Live' ? 'ip' : p.line.startsWith(`${p.oop} `) ? 'oop' : p.line.startsWith(`${p.ip} `) ? 'ip' : null);

/** Every pairing the seating puts in rotation: its ranges, pot and stack, and who raised before the flop. */
export function spotsOf(seating) {
  if (seating.pool === 'own') { const c = savedSetup(); return [{ oop: c.oop, ip: c.ip, pot: c.pot, stack: c.stack }]; }
  const s = seating.pool === 'live' ? { actions: ['Live'], ...seating.live } : seating.online;
  return ALL.filter((p) => s.actions.includes(p.action) && s.oop.includes(p.oop) && s.ip.includes(p.ip)).map((p) => ({ oop: p.ranges.oop, ip: p.ranges.ip, pot: p.pot, stack: p.stack, raiser: raiserOf(p) }));
}

/** The setup Play is dealt with: Study's betting with the table's bet sizes, and the spots in rotation. */
export function configOf(seating) {
  const spots = spotsOf(seating); const first = spots[0] ?? {};
  return { ...savedSetup(), ...first, bets: seating.bets, spots, budget: BUDGET };
}

/** What the seating is, in a few words, for the table's corner. */
export function seatingLabel(seating) {
  const n = spotsOf(seating).length; const name = POOLS.find(([key]) => key === seating.pool)?.[1] ?? '';
  return seating.pool === 'own' ? 'Own ranges' : n > 1 ? `${name} · ${n} spots` : name;
}
