// What the explanation panel says: for a hand, the reasons the worker gives (with the spot's sentence on the street the
// ranges start on); for the range, its reasons with what would change it put in its place.
const WORKING = (text) => ({ text: `Working out ${text}…`, quiet: true });

/** A hand's reasons, or that they are being worked out. */
export function handReasons(got, spot, decision, round) {
  const reasons = !got ? [WORKING('the reasons')] : got.silent ? [...got.reasons, { text: got.silent, quiet: true }] : [...got.reasons];
  // the spot sentence is about the ranges as they start, so it stays with the street they start on
  if (spot?.text && !(round > 0)) reasons.push({ text: spot.text });
  return reasons;
}

/** The range's reasons with what would change it (once worked out) before the one that says which hands do what. */
export function rangeReasons(got, whatif) {
  const change = whatif?.said ?? (whatif ? null : WORKING('what would change it'));
  if (!change) return got.reasons;
  const at = got.reasons.findIndex((r) => r.id === 'which'); const list = [...got.reasons];
  list.splice(at >= 0 ? at : list.length, 0, change);
  return list;
}
