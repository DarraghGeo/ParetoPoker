/**
 * Action names in table shorthand: X check, C call, F fold, B33 a bet of 33% of the pot, R2.5x a
 * raise to 2.5 times the bet faced, All-in.
 *
 * @param {string} kind 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin'
 * @param {{ add?: number, pot?: number, to?: number, faced?: number }} [amounts] For a bet: what
 *   it puts in and the pot. For a raise: the player's total on the street after it, and the bet faced.
 */
export function notation(kind, { add = 0, pot = 0, to = 0, faced = 0 } = {}) {
  const share = (x, of) => (of > 0 ? Math.round((100 * x) / of) : 0);
  switch (kind) {
    case 'check': return 'X';
    case 'call': return 'C';
    case 'fold': return 'F';
    case 'bet': return `B${share(add, pot)}`;
    case 'raise': return `R${faced > 0 ? String(Math.round((10 * to) / faced) / 10) : ''}x`;
    case 'allin': case 'all-in': return 'All-in';
    default: return String(kind);
  }
}
