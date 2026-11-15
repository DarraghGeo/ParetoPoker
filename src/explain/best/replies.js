// The hero's play at his own decisions, given what each action is worth from there (`parts[k][hand]`): the solved
// strategy ('average'), the best reply ('best'), or the best reply a walk kept earlier ('fixed').

const planKey = (id, board) => `${id}|${board.join(',')}`;

export function averageReply(g, st, parts, heroes) {
  const out = new Float64Array(g.N);
  for (const h of heroes) {
    const i = st.rowOf(h); if (i < 0) continue;
    let sum = 0; for (let k = 0; k < parts.length; k++) sum += st.probs[i * st.n + k] * parts[k][h];
    out[h] = sum;
  }
  return out;
}

/** The most a hand can make here, with the action that makes it noted in `choice` when one is kept. */
function bestOf(parts, h, choice) {
  let best = -Infinity; let pick = 0;
  for (let k = 0; k < parts.length; k++) if (parts[k][h] > best) { best = parts[k][h]; pick = k; }
  if (choice) choice[h] = pick;
  return best;
}

/** The best reply, and a note of which it was when a plan is kept, so that the same play can be valued against part of his range. */
export function bestReply(g, id, board, parts, heroes) {
  const out = new Float64Array(g.N);
  const choice = g.plan ? new Uint8Array(g.N) : null;
  for (const h of heroes) out[h] = bestOf(parts, h, choice);
  if (g.plan) g.plan.set(planKey(id, board), choice);
  return out;
}

export function keptReply(g, id, board, parts, heroes) {
  const out = new Float64Array(g.N);
  const choice = g.plan.get(planKey(id, board));
  for (const h of heroes) out[h] = parts[choice[h]][h];
  return out;
}
