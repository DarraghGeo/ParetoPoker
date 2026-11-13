// The battery: spots every claim is checked on. Varied on purpose: paired, monotone, two-tone and rainbow
// boards (so mirrored runouts are and are not in play), wide and narrow ranges, one and several sizes, raises.
export const WIDE_OOP = '66+,A8s+,A5s-A4s,AJo+,K9s+,KQo,QTs+,JTs,96s+,85s+,75s+,65s,54s';
export const WIDE_IP = 'QQ-22,AQs-A2s,ATo+,K5s+,KJo+,Q8s+,J8s+,T7s+,96s+,86s+,75s+,64s+,53s+';
const BTN = '22+,A2s+,A7o+,K6s+,KTo+,Q8s+,QTo+,J8s+,JTo,T8s+,97s+,87s,76s,65s';
const BB = '99-22,AJs-A2s,AJo-A8o,K2s+,K9o+,Q6s+,QTo+,J7s+,JTo,T7s+,96s+,85s+,75s+,64s+,54s';
const TIGHT_OOP = 'QQ+,AKs,AKo,JJ,TT,AQs,KQs'; const TIGHT_IP = 'JJ-77,AQs-ATs,KQs,KJs,QJs,JTs,T9s,98s';
export const TURNS = [
  { name: 'turn two-tone wide', board: 'Td9d6hQc', oop: WIDE_OOP, ip: WIDE_IP, betSizes: [[0.33, 0.75]], raiseSizes: [{ times: 2.5 }], maxRaises: 2 },
  { name: 'turn rainbow BB v BTN', board: 'Ks7h3d2c', oop: BB, ip: BTN, betSizes: [[0.5]], raiseSizes: [{ times: 3 }], maxRaises: 2 },
  { name: 'turn flush board', board: 'As9s4s8h', oop: BB, ip: BTN, betSizes: [[0.33, 1]], raiseSizes: [{ times: 3 }], maxRaises: 2 },
  { name: 'turn paired', board: 'JhJc5d9s', oop: BB, ip: BTN, betSizes: [[0.66]], raiseSizes: [{ times: 2.5 }], maxRaises: 2 },
  { name: 'turn tight ranges deep', board: 'QhTh4c2d', oop: TIGHT_OOP, ip: TIGHT_IP, stack: 400, betSizes: [[0.5, 1.25]], raiseSizes: [{ times: 3 }], maxRaises: 3, allowAllIn: true },
  { name: 'turn two flush draws', board: '8h7h5c2c', oop: WIDE_OOP, ip: WIDE_IP, betSizes: [[0.75]], raiseSizes: [{ times: 3 }], maxRaises: 2 },
];
export const FLOPS = [
  { name: 'flop two-tone', board: 'Td9d6h', oop: WIDE_OOP, ip: WIDE_IP, betSizes: [[0.33], [0.66], [0.66]], raiseSizes: [{ times: 2.5 }], maxRaises: 2 },
  { name: 'flop rainbow dry', board: 'Ks7h2d', oop: BB, ip: BTN, betSizes: [[0.33], [0.66], [0.75]], raiseSizes: [{ times: 3 }], maxRaises: 2 },
  { name: 'flop monotone tight', board: 'Qs8s4s', oop: TIGHT_OOP, ip: TIGHT_IP, betSizes: [[0.5], [0.5], [0.75]], raiseSizes: [{ times: 3 }], maxRaises: 2 },
  { name: 'flop paired', board: '8h8c3d', oop: BB, ip: BTN, betSizes: [[0.33], [0.66], [0.66]], raiseSizes: [{ times: 3 }], maxRaises: 2 },
];
// Held back: never used to choose a threshold, only to test the finished claims.
const CO = '22+,A2s+,A9o+,K8s+,KTo+,Q9s+,QJo,J9s+,T8s+,97s+,86s+,76s,65s,54s'; const SB3 = 'TT+,AQs+,AKo,A5s-A4s,KQs,KJs,QJs,JTs,T9s';
export const HELD_TURNS = [
  { name: 'held turn ace-high dry', board: 'Ah8c3s5d', oop: BB, ip: CO, betSizes: [[0.33, 0.75]], raiseSizes: [{ times: 3 }], maxRaises: 2 },
  { name: 'held turn connected', board: '9s8s7d2h', oop: WIDE_OOP, ip: BTN, betSizes: [[0.5, 1]], raiseSizes: [{ times: 2.5 }], maxRaises: 2 },
  { name: 'held turn broadway', board: 'KdQhJs4c', oop: SB3, ip: TIGHT_IP, stack: 300, betSizes: [[0.33, 0.75]], raiseSizes: [{ times: 3 }], maxRaises: 2, allowAllIn: true },
  { name: 'held turn low paired', board: '6d6c2s9h', oop: BB, ip: CO, betSizes: [[0.5]], raiseSizes: [{ times: 3 }], maxRaises: 2 },
  { name: 'held turn monotone', board: 'Kh9h5h2s', oop: WIDE_OOP, ip: WIDE_IP, betSizes: [[0.33, 0.75]], raiseSizes: [{ times: 3 }], maxRaises: 1 },
  { name: 'held turn three sizes', board: 'Tc7d4s2h', oop: BB, ip: BTN, stack: 150, betSizes: [[0.33, 0.75, 1.5]], raiseSizes: [{ times: 2.5 }], maxRaises: 2 },
];
// A second set held back, for the verdict after the first set had been used to restate two claims.
export const HELD2_TURNS = [
  { name: 'final turn king-high two-tone', board: 'Kc8c4d6h', oop: BB, ip: BTN, betSizes: [[0.33, 0.75]], raiseSizes: [{ times: 3 }], maxRaises: 2 },
  { name: 'final turn double paired', board: 'TsTd5h5c', oop: BB, ip: CO, betSizes: [[0.5]], raiseSizes: [{ times: 3 }], maxRaises: 2 },
  { name: 'final turn wheel cards', board: '5d4s3hKs', oop: WIDE_OOP, ip: WIDE_IP, betSizes: [[0.33, 1]], raiseSizes: [{ times: 2.5 }], maxRaises: 2 },
  { name: 'final turn ace on the turn', board: 'Jd9s5cAh', oop: SB3, ip: BTN, stack: 250, betSizes: [[0.5, 1.25]], raiseSizes: [{ times: 3 }], maxRaises: 2 },
  { name: 'final turn four to a straight', board: '8d7c6sTh', oop: WIDE_OOP, ip: BTN, betSizes: [[0.66]], raiseSizes: [{ times: 3 }], maxRaises: 2, allowAllIn: true },
  { name: 'final turn shallow', board: 'Qd7d2sJc', oop: BB, ip: CO, stack: 80, betSizes: [[0.33, 0.75]], raiseSizes: [{ times: 2.5 }], maxRaises: 2, allowAllIn: true },
];
export const HELD_FLOPS = [
  { name: 'held flop ace-high', board: 'Ad7s2c', oop: BB, ip: CO, betSizes: [[0.33], [0.66], [0.75]], raiseSizes: [{ times: 3 }], maxRaises: 1 },
  { name: 'held flop low connected', board: '7h6h4c', oop: WIDE_OOP, ip: WIDE_IP, betSizes: [[0.5], [0.66], [0.66]], raiseSizes: [{ times: 2.5 }], maxRaises: 2 },
];
export const RIVERS = [
  { name: 'river default', board: 'Td9d6hQc7s', oop: WIDE_OOP, ip: WIDE_IP, betSizes: [[0.33, 0.75, 1.5]], raiseSizes: [{ times: 2.5 }], maxRaises: 2 },
  { name: 'river dry', board: 'Ks7h3d2c9s', oop: BB, ip: BTN, betSizes: [[0.5, 1]], raiseSizes: [{ times: 3 }], maxRaises: 2 },
  { name: 'river flush', board: 'As9s4s8h2d', oop: BB, ip: BTN, betSizes: [[0.33, 1]], raiseSizes: [{ times: 3 }], maxRaises: 2 },
  { name: 'river paired', board: 'JhJc5d9s3c', oop: BB, ip: BTN, betSizes: [[0.66]], raiseSizes: [{ times: 2.5 }], maxRaises: 2 },
  { name: 'river four straight', board: '8h7h5c2c6d', oop: WIDE_OOP, ip: WIDE_IP, betSizes: [[0.75]], raiseSizes: [{ times: 3 }], maxRaises: 2 },
  { name: 'river brick deep', board: 'QhTh4c2d3s', oop: WIDE_OOP, ip: BTN, stack: 300, betSizes: [[0.33, 0.75, 1.5]], raiseSizes: [{ times: 3 }], maxRaises: 2 },
];
export const HELD_RIVERS = [
  { name: 'held river ace-high', board: 'Ah8c3s5dJd', oop: BB, ip: CO, betSizes: [[0.33, 0.75]], raiseSizes: [{ times: 3 }], maxRaises: 2 },
  { name: 'held river connected', board: '9s8s7d2hKc', oop: WIDE_OOP, ip: BTN, betSizes: [[0.5, 1]], raiseSizes: [{ times: 2.5 }], maxRaises: 2 },
  { name: 'held river broadway', board: 'KdQhJs4c4h', oop: SB3, ip: TIGHT_IP, stack: 300, betSizes: [[0.33, 0.75]], raiseSizes: [{ times: 3 }], maxRaises: 2, allowAllIn: true },
  { name: 'held river flush comes', board: 'Kh9h5c2sQh', oop: WIDE_OOP, ip: WIDE_IP, betSizes: [[0.33, 0.75, 1.5]], raiseSizes: [{ times: 3 }], maxRaises: 2 },
  { name: 'held river low', board: 'Tc7d4s2h2d', oop: BB, ip: BTN, stack: 150, betSizes: [[0.5, 1.25]], raiseSizes: [{ times: 2.5 }], maxRaises: 2 },
  { name: 'held river shallow', board: 'Qd7d2sJc3h', oop: BB, ip: CO, stack: 80, betSizes: [[0.33, 0.75]], raiseSizes: [{ times: 2.5 }], maxRaises: 2, allowAllIn: true },
];
export const config = (s) => ({ pot: 100, stack: 200, ...Object.fromEntries(Object.entries(s).filter(([k]) => k !== 'name')) });

/** Spots drawn at random (a fixed seed, so the set is the same every time): the broad test of a rule once it is fixed. */
export const randomRivers = (count, seed = 77001) => randomTurns(count, seed, 5).map((s, i) => ({ ...s, name: `random river ${String(i + 1).padStart(2, '0')}` }));
export function randomTurns(count, seed = 20261113, cardsOnBoard = 4) {
  let state = seed; const rand = (n) => { state = (state * 1103515245 + 12345) & 0x7fffffff; return state % n; };
  const OOP = [WIDE_OOP, BB, SB3, TIGHT_OOP, 'JJ-22,AQs-A2s,AQo-A9o,KTs+,KJo+,Q9s+,J9s+,T8s+,97s+,86s+,76s,65s', '88+,ATs+,AJo+,KJs+,KQo,QJs,JTs,T9s,98s,A5s-A2s'];
  const IP = [WIDE_IP, BTN, CO, TIGHT_IP, '99-22,AJs-A2s,KQs-K8s,QJs-Q9s,JTs,J9s,T9s,T8s,98s,87s,76s,65s,54s,AJo-ATo,KQo,KJo', 'TT-33,AQs-A6s,KQs-KTs,QJs,QTs,JTs,T9s,98s,87s,AQo,AJo,KQo'];
  const SIZES = [[[0.33]], [[0.5]], [[0.75]], [[0.33, 0.75]], [[0.5, 1]], [[0.33, 0.75, 1.5]], [[0.66, 1.25]]];
  const cards = 'AKQJT98765432'; const suits = 'shdc'; const out = [];
  while (out.length < count) {
    const board = []; while (board.length < cardsOnBoard) { const c = cards[rand(13)] + suits[rand(4)]; if (!board.includes(c)) board.push(c); }
    out.push({ name: `random turn ${String(out.length + 1).padStart(2, '0')}`, board: board.join(''), oop: OOP[rand(OOP.length)], ip: IP[rand(IP.length)], stack: [80, 150, 200, 300, 400][rand(5)], betSizes: SIZES[rand(SIZES.length)], raiseSizes: [{ times: [2.5, 3][rand(2)] }], maxRaises: 1 + [1, 1, 2][rand(3)], allowAllIn: rand(3) === 0 });
  }
  return out;
}

/** Fresh random spots with a better generator and their own seed: the sets a rule is finally judged on. */
export function freshSpots(count, cardsOnBoard, seed) {
  let a = seed >>> 0; const rnd = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const rand = (n) => Math.floor(rnd() * n);
  const OOP = [WIDE_OOP, BB, SB3, TIGHT_OOP, 'JJ-22,AQs-A2s,AQo-A9o,KTs+,KJo+,Q9s+,J9s+,T8s+,97s+,86s+,76s,65s', '88+,ATs+,AJo+,KJs+,KQo,QJs,JTs,T9s,98s,A5s-A2s'];
  const IP = [WIDE_IP, BTN, CO, TIGHT_IP, '99-22,AJs-A2s,KQs-K8s,QJs-Q9s,JTs,J9s,T9s,T8s,98s,87s,76s,65s,54s,AJo-ATo,KQo,KJo', 'TT-33,AQs-A6s,KQs-KTs,QJs,QTs,JTs,T9s,98s,87s,AQo,AJo,KQo'];
  const SIZES = [[[0.33]], [[0.5]], [[0.75]], [[0.33, 0.75]], [[0.5, 1]], [[0.33, 0.75, 1.5]], [[0.66, 1.25]], [[0.25, 0.66]]];
  const cards = 'AKQJT98765432'; const suits = 'shdc'; const street = ['', '', '', 'flop', 'turn', 'river'][cardsOnBoard]; const out = [];
  while (out.length < count) {
    const board = []; while (board.length < cardsOnBoard) { const c = cards[rand(13)] + suits[rand(4)]; if (!board.includes(c)) board.push(c); }
    out.push({ name: `fresh ${street} ${String(out.length + 1).padStart(2, '0')}`, board: board.join(''), oop: OOP[rand(OOP.length)], ip: IP[rand(IP.length)], stack: [80, 150, 200, 300, 400][rand(5)], betSizes: SIZES[rand(SIZES.length)], raiseSizes: [{ times: [2.5, 3][rand(2)] }], maxRaises: 1 + [1, 1, 2][rand(3)], allowAllIn: rand(3) === 0 });
  }
  return out;
}
