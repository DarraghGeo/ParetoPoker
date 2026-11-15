// Study's game: the spot on screen (the tree, the decision, the hand picked, the cards dealt), the versions of its ranges,
// the answers the worker has given, and which panel is open. The worker solves (workers/study.js); solving.js moves on.
import { SvelteMap } from 'svelte/reactivity';
import { savedSetup } from '../setup.js';
import { heard } from './heard.js';
import { loadViews } from './prefs.js';

class Shown {
  nodes = $state.raw(null); node = $state(0); decision = $state.raw(null); survey = $state.raw(null); spot = $state.raw(null);
  hand = $state(null); cell = $state(null); dealt = $state.raw([]); pick = $state(null); scrub = $state(false);
  versions = $state.raw([]); at = $state(0); slide = $state(''); status = $state(''); busy = $state(false); load = $state.raw(null);
}

class StudyState extends Shown {
  config = $state(savedSetup()); views = $state(loadViews()); tab = $state('why');
  told = new SvelteMap(); looked = new SvelteMap(); ranged = new SvelteMap(); whatif = new SvelteMap();
  panel = $state(''); form = $state(null); draft = $state({ side: 'oop', oop: '', ip: '' }); setupError = $state(''); fit = $state.raw({ lite: false, note: '' });
  edit = $state(null); editView = $state.raw(null); group = $state(null);
  asked = new Set(); job = 0; versionId = 0; fitId = 0; open = null; sub = null; refining = false; onward = null; awaiting = null;
}

/** A Study with its worker. */
export function createStudyGame() {
  const game = new StudyState();
  game.worker = new Worker(new URL('../../workers/study.js', import.meta.url));
  game.worker.onmessage = ({ data }) => heard(game, data);
  return game;
}
