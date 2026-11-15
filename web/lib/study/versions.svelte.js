// The versions of a spot's ranges: the setup's, each edit saved, each street re-solved on its own. `at` is the one on
// screen; each remembers where it was last looked at.
import { neutral } from '../../../src/warp/reshape.js';
import { streetsFrom } from '../../solver/betting.js';
import { remember as keepViews } from './prefs.js';

export const START = () => ({ node: 0, dealt: [] });
export const boardCards = (text) => text.match(/[2-9TJQKA][shdc]/g) ?? [];
export const version = (game) => game.versions[game.at];
export const configOf = (game) => $state.snapshot(game.config);
/** The spot of the version on screen: the setup, with what a re-solved street changes. */
export const conf = (game) => ({ ...configOf(game), ...(version(game)?.base ?? {}) });
export const placeOf = (game) => ({ node: game.node, dealt: [...game.dealt] });
export const remember = (game) => keepViews(game, configOf(game));

/** A version of the ranges; `fixed` for a street re-solved on its own, whose ranges are as they arrived (nothing to edit). */
export function versionOf(game, { oop, ip, base = null, fixed = false, dials = { oop: neutral(), ip: neutral() }, pos = START() }) {
  return { id: ++game.versionId, oop, ip, dials, curves: new Map(), fixed, base, pos };
}

/** A new version after the one on screen (any after it dropped); its index. */
export function addVersion(game, v) {
  game.versions = [...game.versions.slice(0, game.at + 1), v];
  return game.versions.length - 1;
}

/** The betting of a street re-solved on its own, on a board of `cards` cards. */
export const subBetting = (c, cards) => ({ bets: streetsFrom(c, cards), raises: c.raises, maxRaises: c.maxRaises, allIn: c.allIn });
