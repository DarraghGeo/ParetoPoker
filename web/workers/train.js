// Deals training spots: solves off the main thread and hands back the decisions to ask about. Every spot starts on a
// flop. A turn is a flop played down one of the lines its solution takes, a card dealt, and that street solved again for
// the ranges that arrive; a river, the same from a turn.
import { drawCards, mass } from '../solver/deck.js';
import { exported, flopJob, lineEnds, streetJob } from '../solver/jobs.js';
import { nearby, onto } from '../solver/near.js';
import { pause } from '../solver/progress.js';
import { positions } from './positions.js';

/** Turns dealt off one flop, and rivers off one turn, before a new one is solved; flops solved from one another in a row. */
const TURNS = 4; const RIVERS = 3; const CHAIN = 2;
/** How many decisions one solve gives, by street: earlier streets cost more, so each is used for more spots. */
const SPOTS = { flop: 5, turn: 3, river: 2 };
/** A line is played down only when both ranges still hold this many combinations at the end of it. */
const ENOUGH = 8;
/** The last turn and river solves, kept so that Study can open on them. */
const SHELF = 6;

const kept = { setup: null, flop: null, turn: null, shelf: new Map(), solves: 0, job: 0 };

/** Step a job until it is done, saying how far along it is; null when a newer request took over. */
async function run(job, live, say) {
  for (;;) {
    if (!live()) return null;
    const result = job.step();
    say(job.street, job.done());
    if (result) return result;
    await pause();
  }
}

/** Keep a solve for Study, the oldest dropped; its number. */
function shelve(solved) {
  const id = ++kept.solves; kept.shelf.set(id, solved);
  for (const key of kept.shelf.keys()) { if (kept.shelf.size <= SHELF) break; kept.shelf.delete(key); }
  return id;
}

/** A new flop: a card away from the last one (solved from it) unless the chain is long enough, else dealt fresh. */
function nextFlop(config) {
  const from = kept.flop && kept.flop.chain < CHAIN ? kept.flop : null;
  const near = from ? nearby(from.solved.cards) : null;
  const cards = near ?? drawCards(3);
  const warm = near ? { run: from.solved.run, cards: onto(cards, from.solved.cards) } : null;
  return { job: flopJob(config, cards, warm), chain: warm ? from.chain + 1 : 0 };
}

/** A line the solution takes to the end of the street, picked by how often it is taken, and the card dealt after it. */
function pickLine(parent) {
  for (let tries = 0; tries < 8; tries++) {
    const cards = [...parent.cards, drawCards(1, new Set(parent.cards))[0]];
    const ends = lineEnds(parent, cards).filter((e) => e.oop >= ENOUGH && e.ip >= ENOUGH);
    if (!ends.length) continue;
    let roll = Math.random() * mass(ends.map((e) => e.weight));
    return { end: (ends.find((e) => (roll -= e.weight) <= 0) ?? ends[ends.length - 1]).id, cards };
  }
  throw new Error('No line of play leaves both ranges enough hands.');
}

/** The actions that ended a street at `end`, each with who took it. */
function actionsTo(nodes, end) {
  const actions = []; let at = end;
  while (nodes[at].parent >= 0) {
    const before = nodes[nodes[at].parent];
    if (before.kind === 'decision') actions.unshift({ seat: before.seat, label: before.edges[nodes[at].via].label });
    at = before.id;
  }
  return actions;
}

/** The next street off a solved one: a line played down, a card dealt, the street solved again; null when superseded. */
async function nextStreet(parent, config, live, say) {
  const { end, cards } = pickLine(parent);
  const solved = await run(streetJob(config, parent, end, cards), live, say);
  if (!solved) return null;
  if (solved.failed) throw new Error('No line of play leaves both ranges enough hands.');
  const history = [...(parent.history ?? []), { street: parent.street, cards: parent.street === 'flop' ? parent.cards : parent.cards.slice(-1), actions: actionsTo(parent.nodes, end) }];
  return { ...solved, history, solve: shelve(solved) };
}

/** The street to ask about: the flop kept or a new one, then the turn kept or a new one, then a river off it. */
async function solvedFor(street, config, live, say) {
  const setup = JSON.stringify(config);
  if (kept.setup !== setup) Object.assign(kept, { setup, flop: null, turn: null });
  if (street === 'flop' || !kept.flop || (kept.flop.left <= 0 && (street === 'turn' || !kept.turn || kept.turn.left <= 0))) {
    const { job, chain } = nextFlop(config); const solved = await run(job, live, say); if (!solved) return null;
    Object.assign(kept, { flop: { solved, chain, left: TURNS, near: chain > 0 }, turn: null });
  }
  if (street === 'flop') return kept.flop.solved;
  if (street === 'turn' || !kept.turn || kept.turn.left <= 0) {
    const solved = await nextStreet(kept.flop.solved, config, live, say); if (!solved) return null;
    kept.flop.left--; kept.turn = { solved, left: RIVERS };
  }
  if (street === 'turn') return kept.turn.solved;
  const river = await nextStreet(kept.turn.solved, config, live, say); if (river) kept.turn.left--;
  return river;
}

const handlers = {
  async deal(data) {
    const mine = ++kept.job; const live = () => mine === kept.job;
    const say = (street, done) => self.postMessage({ type: 'progress', id: data.id, street, done });
    try {
      const solved = await solvedFor(data.street, data.config, live, say);
      if (solved) self.postMessage({ type: 'dealt', id: data.id, street: data.street, near: data.street === 'flop' && kept.flop.near, decisions: positions(solved, SPOTS[data.street]) });
    } catch (error) { self.postMessage({ type: 'error', id: data.id, message: String(error?.message ?? error).split('\n')[0] }); }
  },
  export(data) {
    const solved = kept.shelf.get(data.solve);
    if (!solved) { self.postMessage({ type: 'export', ask: data.ask, found: false }); return; }
    const out = exported(solved);
    self.postMessage({ type: 'export', ask: data.ask, found: true, ...out }, [out.sums.buffer]);
  },
};
self.onmessage = ({ data }) => handlers[data.type]?.(data);
