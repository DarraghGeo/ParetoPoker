// The answers the worker gives about the decision on screen, each asked for once: keyed by the decision and the cards
// dealt (the range's answers) and by the hand too (a hand's).
export const placeKey = (game, id = game.node) => `${id}|${game.dealt.join(' ')}`;
export const handKey = (game, combo, id = game.node) => `${placeKey(game, id)}|${combo}`;

/** Ask once (never while a thumb slides along the chart: the answer is asked for when it lifts). */
export function askOnce(game, key, message) {
  if (game.asked.has(key) || game.scrub) return;
  game.asked.add(key);
  game.worker.postMessage({ job: game.job, id: game.node, dealt: [...game.dealt], ...message });
}

export function clearAnswers(game) {
  for (const map of [game.told, game.looked, game.ranged, game.whatif]) map.clear();
  game.asked.clear(); game.parts = null;   // a finer solve of the same decision has its own numbers
}

/** The worker's answers, kept where the panels look for them. */
export const ANSWERS = {
  looked: (game, d) => game.looked.set(handKey(game, d.combo ?? null, d.id), d.look ?? { types: [], spread: null }),
  whatif: (game, d) => game.whatif.set(placeKey(game, d.id), d.said ?? { skipped: 'failed' }),
  ranged: (game, d) => game.ranged.set(placeKey(game, d.id), d.said ?? { line: '', reasons: [] }),
  told: (game, d) => game.told.set(handKey(game, d.combo, d.id), d.told ?? { line: '', reasons: [], silent: d.error ?? '' }),
};
