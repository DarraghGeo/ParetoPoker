// Its cards: whose hands they take away, and so how often he folds to this hand against the weak hands around it.
import { study } from '../study.js';
import { hisName } from '../hand-words.js';
import { sharesCard } from '../shared-cards.js';
import { percent, listOf, isWager } from '../words.js';

/** The names that make up a fifth or more of a weight, the two largest. */
const mainNames = (map, all) => [...map.entries()].filter(([, w]) => all > 0 && w / all >= 0.2).sort((p, q) => q[1] - p[1]).slice(0, 2).map(([n]) => n);
const add = (map, name, w) => map.set(name, (map.get(name) ?? 0) + w);

/** Which of his hands this hand's cards take away, among those that continue against a bet and those that fold to it. */
function blocked(s, a, c) {
  const { fs, f } = s; if (!s.solution) return null;
  const s2 = study(fs, s.solution, f.nodes, f.node.edges[a].child, s.dealt ?? []); if (!s2) return null;
  const fold = s2.f.node.edges.findIndex((e) => e.kind === 'fold'); const cont = new Map(); const gone = new Map(); let contAll = 0, foldAll = 0;
  for (let v = 0; v < fs.COMBOS; v++) {
    const w = s2.f.mine[v]; if (!(w > 0) || !sharesCard(fs, v, c)) continue;
    const p = fold >= 0 ? s2.sigma(v, fold) : 0; const name = hisName(s2.featuresOf(v));
    add(cont, name, w * (1 - p)); add(gone, name, w * p); contAll += w * (1 - p); foldAll += w * p;
  }
  return { continues: mainNames(cont, contAll), folds: mainNames(gone, foldAll) };
}

/** How often he folds to the bet against the range's weak hands (under a quarter of the equity), on average. */
function weakFolds(s, fold) {
  const eq = s.equity(); let w = 0, t = 0;
  for (let c = 0; c < eq.length; c++) if (s.f.mine[c] > 0 && eq[c] < 0.25 && !Number.isNaN(fold[c])) { w += s.f.mine[c]; t += s.f.mine[c] * fold[c]; }
  return w > 0 ? t / w : null;
}

function blockerText(helps, names) {
  if (helps && names.length) return `It blocks hands that would continue: his ${listOf(names)}. So he folds more often to this hand.`;
  if (helps) return 'Its cards help: he folds more often to this hand than to your other weak hands.';
  if (names.length) return `It blocks hands that would fold: his ${listOf(names)}. So he folds less often to this hand.`;
  return 'Its cards work against it: he folds less often to this hand than to your other weak hands.';
}

export function blockersReason({ s, m, label }) {
  const bets = m.actions.map((x, i) => i).filter((i) => m.actions[i].on && m.actions[i].folds != null && isWager(m.actions[i].kind));
  if (!(bets.length && m.equity < 0.25)) return null;
  const main = bets.sort((x, y) => m.actions[y].freq - m.actions[x].freq)[0];
  const fold = s.closely(main).replies?.find((r) => r.kind === 'fold')?.share; if (!fold) return null;
  const avg = weakFolds(s, fold); const mine = m.actions[main].folds;
  if (!(avg != null && Math.abs(mine - avg) >= 0.015)) return null;
  const helps = mine > avg; const b = blocked(s, main, m.combo); const names = b ? (helps ? b.continues : b.folds) : [];
  return { id: 'cards-held', text: blockerText(helps, names),
    detail: `He folds ${percent(mine)} to ${label(main)} against this hand, and ${percent(avg)} against your weak hands on average.` };
}
