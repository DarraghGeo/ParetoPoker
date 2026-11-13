/**
 * Action names in table shorthand: X check, C call, F fold, B33 a bet of 33% of the pot, R30 a
 * raise of 30% of the pot (what it adds beyond the call, against the pot once called), All-in.
 *
 * @param {string} kind 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin'
 * @param {{ add?: number, toCall?: number, pot?: number }} [amounts] What the action puts in,
 *   what is owed, and the pot as it stands (his bet included).
 */
export function notation(kind, { add = 0, toCall = 0, pot = 0 } = {}) {
  const share = (x, of) => (of > 0 ? Math.round((100 * x) / of) : 0);
  switch (kind) {
    case 'check': return 'X';
    case 'call': return 'C';
    case 'fold': return 'F';
    case 'bet': return `B${share(add, pot)}`;
    case 'raise': return `R${share(add - toCall, pot + toCall)}`;
    case 'allin': case 'all-in': return 'All-in';
    default: return String(kind);
  }
}
