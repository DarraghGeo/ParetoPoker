// Play's game: the hand on screen as the worker describes it (workers/play.js), what is being solved and how far along,
// and the session's chips won from the flop on (kept for the day).
import { dayKey } from '../days.js';
import { savedSetup } from '../setup.js';
import { keep, load } from '../storage.js';

const KEY = 'pareto-play';

/** Today's session: chips won and hands played (a new day starts a new one). */
function loadSession() {
  const saved = load(KEY);
  return saved?.day === dayKey() ? saved : { day: dayKey(), net: 0, hands: 0, last: 0 };
}

export class PlayGame {
  state = $state.raw(null);
  status = $state.raw(null);
  progress = $state.raw(null);
  error = $state('');
  session = $state(loadSession());
  study = $state.raw(null);
  config = savedSetup(); onExport = () => {};

  constructor() {
    this.worker = new Worker(new URL('../../workers/play.js', import.meta.url));
    this.worker.onmessage = ({ data }) => this.heard[data.type]?.(data);
    this.worker.postMessage({ type: 'setup', config: $state.snapshot(this.config) });
  }

  heard = {
    export: (data) => this.onExport(data),
    status: (data) => { this.status = data; },
    progress: (data) => { this.progress = data; },
    ready: () => { if (!this.state) this.deal(); },
    error: (data) => { this.error = data.message; },
    state: (data) => this.shown(data),
  };

  /** The hand as it stands now: kept for Study while there is a decision, and a finished hand counted once. */
  shown(data) {
    this.state = data;
    if (data.study) this.study = { ...data.study, hero: data.hero };
    if (!data.result || this.session.last === data.id) return;
    Object.assign(this.session, { last: data.id, net: this.session.net + data.result.net, hands: this.session.hands + 1 });
    keep(KEY, $state.snapshot(this.session));
  }

  deal() { this.state = null; this.error = ''; this.worker.postMessage({ type: 'deal' }); }
  act(label) { this.worker.postMessage({ type: 'act', label }); }
}
