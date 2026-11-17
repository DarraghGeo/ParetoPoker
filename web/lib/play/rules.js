// The player's rules on trial: over the hands played, how often each rule agreed with the solver and what following it
// cost, and the decisions where it did not, kept on this device for refining the rule.
import { spelled } from '../actions.js';
import { studyUrl } from '../links.js';
import { keep, load } from '../storage.js';
import { RULES } from '../../../src/rules/rules.js';

const KEY = 'pareto-rules';
/** How many decisions where a rule did not hold are kept, the newest first. */
export const MISSES = 80;
const STREET = { flop: 'Flop', turn: 'Turn', river: 'River' };
const SAYS = { bet: 'bet', check: 'check', call: 'call', continue: 'continue', raise: 'raise', fold: 'fold' };

export const loadRules = () => { const kept = load(KEY); return kept?.stats ? kept : { stats: {}, misses: [] }; };
/** What the solver does with the hand, most often first: "checks 82%, bets 33% 18%". */
const solverSaid = (mix) => [...mix].filter((m) => m.freq >= 0.03).sort((a, b) => b.freq - a.freq).map((m) => `${spelled(m).toLowerCase()} ${Math.round(100 * m.freq)}%`).join(', ');

/** Hero's decisions in a finished hand that carry a rule, each with where it was made. */
function decisionsIn(st, config) {
  const out = []; const line = []; const flop = st.history[0].cards.replace(/\s+/g, '');
  st.history.forEach((h, k) => {
    const inStreet = []; const kept = st.result.streets?.[k];
    const dealt = st.history.slice(1, k + 1).map((x) => x.cards); const board = st.history.slice(0, k + 1).map((x) => x.cards).join(' ');
    for (const a of h.actions) {
      if (a.who === 'hero' && a.rule) out.push({ a, street: STREET[h.street] ?? h.street, board, href: studyUrl(config, flop, { line: [...line], dealt, hand: st.hero, lite: true, resolve: dealt.length > 0 }), spot: kept ? { ...kept, line: [...inStreet] } : null, flop: k === 0 ? st.result.flop ?? null : null });
      line.push(a.label); inStreet.push(a.label);
    }
  });
  return out;
}

/** A finished hand counted into the rules: each rule met is one more decision, held or not; a miss is kept as an example. */
export function keepRules(game, st) {
  const config = { ...game.config, ...st.spot }; const found = decisionsIn(st, config); if (!found.length) return;
  const stats = { ...game.rules.stats }; const misses = [...game.rules.misses];
  for (const { a, street, board, href, spot, flop } of found) {
    const r = a.rule; const s = stats[r.id] ?? { n: 0, held: 0, cost: 0 };
    stats[r.id] = { n: s.n + 1, held: s.held + (r.held ? 1 : 0), cost: s.cost + (r.cost ?? 0) };
    if (!r.held) misses.unshift({ at: Date.now(), id: r.id, street, hero: st.hero, board, seat: st.seat, says: SAYS[r.says] ?? r.says, why: r.why, solver: solverSaid(a.mix), cost: r.cost, href, spot, flop });
  }
  game.rules = { stats, misses: misses.slice(0, MISSES) }; keep(KEY, game.rules);
}

/** How a rule has done: its share of decisions held, as a whole percent, and how many there were; null before the first. */
export function recordOf(rules, id) { const s = rules.stats[id]; return s?.n ? { pct: Math.round((100 * s.held) / s.n), n: s.n, cost: s.cost / s.n } : null; }

/** Every rule met so far, the least accurate first, with its record and its misses. */
export const ruleList = (rules) => Object.keys(RULES).filter((id) => rules.stats[id]?.n).map((id) => ({ id, text: RULES[id], ...recordOf(rules, id), misses: rules.misses.filter((m) => m.id === id) })).sort((a, b) => a.pct - b.pct);

/** A rule with its record and the decisions where it did not hold, as text to take elsewhere for refining it. */
export function ruleText(r) {
  const head = [`Rule: ${r.text}`, `It agreed with the solver in ${r.pct}% of ${r.n} decisions; following it gave up ${r.cost.toFixed(2)} chips a decision on average.`, '', 'Decisions where it did not hold:'];
  const rows = r.misses.map((m) => `- ${m.street} [${m.board}], hero ${m.hero} ${m.seat === 'oop' ? 'out of position' : 'in position'}: the rule says ${m.says} (${m.why}); the solver ${m.solver}${m.cost != null ? `; following the rule gives up ${m.cost.toFixed(2)}` : ''}.`);
  return [...head, ...(rows.length ? rows : ['(none kept)']), '', 'Please suggest how to refine this rule so that it covers these decisions without getting longer than a sentence or two.'].join('\n');
}
