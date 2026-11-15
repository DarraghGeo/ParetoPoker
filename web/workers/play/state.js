// What the Play worker holds: the setup, the hands dealt (the one being played first, then those waiting), where the
// hand on screen stands, and the solves under way.
export const play = { config: null, hands: [], playing: null, jobs: new Map(), ids: 0 };
/** The hand on screen, if one is being played. */
export const current = () => play.playing?.hand ?? null;
export const say = (message, transfer) => self.postMessage(message, transfer ?? []);
/** Each hand keeps its streets solved again by a key: the street before it and the deal that ended it. */
export const slot = (parentKey, end) => `${parentKey}>${end}`;
