// The hands in which hero made a mistake, the last ten kept on this device to go back to: the hand as text, each mistake
// with what the solver does and what it cost, and the address that opens the decision in Study.
import { spelled } from '../actions.js';
import { studyUrl } from '../links.js';
import { keep, load } from '../storage.js';
import { gradeOf } from './grade.js';
import { handText } from './history.js';

const KEY = 'pareto-mistakes';
/** How many hands are kept. */
export const KEPT = 10;
/** A mistake: a move the solver (nearly) never makes that costs at least `SMALL` in EV (less is within what a quick solve
 *  can tell apart), or any move that gives up at least `COSTLY`, in chips. */
export const COSTLY = 0.5; export const SMALL = 0.1;
const STREET = { flop: 'Flop', turn: 'Turn', river: 'River' };

const PAST = { fold: 'folded', check: 'checked', call: 'called' };
/** Hero's move in the past tense: "bet 75%", "raised 2.5x", "checked". */
const moved = (a) => PAST[a.kind] ?? spelled(a).toLowerCase().replace(/^bet\b/, 'bet').replace(/^raise\b/, 'raised').replace(/(\d)$/, '$1%').replace(/x%$/, 'x');

export const loadMistakes = () => { const kept = load(KEY); return Array.isArray(kept) ? kept : []; };

/** Hero's mistakes in a finished hand, each with where it was made: the street, the line before it and the cards dealt by then. */
function mistakesIn(st, config) {
  const out = []; const line = []; const flop = st.history[0].cards.replace(/\s+/g, '');
  st.history.forEach((h, k) => {
    const dealt = st.history.slice(1, k + 1).map((x) => x.cards);
    for (const a of h.actions) {
      const g = a.who === 'hero' ? gradeOf(a) : null;
      if (g && ((g.level === 'error' && (a.cost ?? SMALL) >= SMALL) || (a.cost ?? 0) >= COSTLY)) {
        out.push({ street: STREET[h.street] ?? h.street, move: moved(a), solver: g.detail.replace(/ · EV.*$/, ''), cost: a.cost ?? null,
          href: studyUrl(config, flop, { line: [...line], dealt, hand: st.hero, lite: true, resolve: dealt.length > 0 }) });
      }
      line.push(a.label);
    }
  });
  return out;
}

/** A finished hand, kept if hero made a mistake in it: the newest first, ten at most. */
export function keepMistakes(game, st) {
  const config = { ...game.config, ...st.spot }; const made = mistakesIn(st, config); if (!made.length) return;
  const entry = { at: Date.now(), hero: st.hero, board: st.board, net: st.result.net, lost: st.result.lost ?? null, mistakes: made, text: handText(st, config) };
  game.mistakes = [entry, ...game.mistakes].slice(0, KEPT); keep(KEY, game.mistakes);
}
