// The line to a decision: each action taken on the way (with who took it and where it was taken) and each card dealt, and
// where an action at the decision leads.
/** The way to a decision from the first, in order. */
export function trail(nodes, at, dealt) {
  const path = [];
  while (nodes[at].parent >= 0) {
    const parent = nodes[nodes[at].parent];
    path.unshift(parent.kind === 'chance' ? { deal: parent.id, card: dealt[parent.round] } : { label: parent.edges[nodes[at].via].label, back: parent.id, seat: parent.seat });
    at = parent.id;
  }
  return path;
}

/** Where an action leads: the next decision (`go`), or a deal on to the next street's first decision (`deal`); null where the hand ends. */
export function leadsTo(nodes, edge) {
  const child = nodes[edge.child];
  if (child.kind === 'decision') return { go: child.id };
  if (child.kind === 'chance' && nodes[child.edges[0]?.child]?.kind === 'decision') return { deal: child.id };
  return null;
}

/** Whether a decision is a street's first after a card dealt: it can be re-solved on its own. */
export const opensStreet = (nodes, here) => here.parent >= 0 && nodes[here.parent].kind === 'chance';
