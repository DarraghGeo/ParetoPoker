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
export const config = (s) => ({ pot: 100, stack: 200, ...Object.fromEntries(Object.entries(s).filter(([k]) => k !== 'name')) });
