import { seatIndex } from './plain-tree.js';

/** The solved strategy at each plain node, read once and kept. */
export function profilesOf(nodes, solved) {
  const kept = new Map();
  return (id) => {
    if (!kept.has(id)) kept.set(id, solved.at(nodes[id].source));
    return kept.get(id);
  };
}

/** A player's range at a node: his start times every action he took on the way. */
export function reachAt(game, id, player) {
  const { nodes, profileAt } = game;
  const out = Float64Array.from(game.start[player]);
  for (let at = id; nodes[at].parent >= 0; at = nodes[at].parent) {
    const parent = nodes[nodes[at].parent];
    if (seatIndex(parent.seat) === player) scaleBy(out, profileAt(parent.id)[nodes[at].via]);
  }
  return out;
}

const scaleBy = (range, share) => { for (let i = 0; i < range.length; i++) range[i] *= share[i]; };
