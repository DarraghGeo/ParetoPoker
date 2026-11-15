// Actions as the pages show them: the colour each takes, and a short label spelled out for a button.
export const COLORS = ['--act-fold', '--act-check', '--act-small', '--act-big', '--act-allin'];

/** Which colour each action takes: fold, check or call, the first size, the other sizes, all-in. */
export function strataOf(actions) {
  let sized = 0;
  return actions.map((a) => {
    if (a.kind === 'fold') return 0;
    if (a.kind === 'check' || a.kind === 'call') return 1;
    if (a.kind === 'allin') return 4;
    return sized++ === 0 ? 2 : 3;
  });
}

/** A mix of actions folded into the five colours: [fold, check or call, first size, other sizes, all-in]. */
export function strataMix(mix, strata) {
  const out = [0, 0, 0, 0, 0];
  mix.forEach((p, a) => { out[strata[a]] += p; });
  return out;
}

const num = (x) => String(Math.round(10 * x) / 10);
/** An action as a button says it: "Call 12", "Bet 33", "Raise 2.5x", "All-in". */
export function spelled(action) {
  const amount = action.label.replace(/^[A-Za-z]+\s*/, '');
  const words = { fold: 'Fold', check: 'Check', call: `Call ${num(action.add ?? 0)}`, bet: `Bet ${amount}`, raise: `Raise ${amount}`, allin: 'All-in' };
  return words[action.kind] ?? action.label;
}
