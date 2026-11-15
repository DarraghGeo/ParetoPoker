// The cards that can come next, named the way a player would: by suit and by rank.

const RANKS_WORD = ['a deuce', 'a three', 'a four', 'a five', 'a six', 'a seven', 'an eight', 'a nine', 'a ten', 'a jack', 'a queen', 'a king', 'an ace'];
const SUIT_WORD = ['a spade', 'a heart', 'a diamond', 'a club'];

/** A suit or a rank that names the cards: three quarters or more of its cards are among them, and at least two. */
function nameFor(name, ofThem, isGood) {
  const hit = ofThem.filter((c) => isGood.has(c));
  return ofThem.length && hit.length / ofThem.length >= 0.75 && hit.length >= 2 ? { name, cards: hit } : null;
}

function candidates(fs, isGood, all) {
  const bySuit = [0, 1, 2, 3].map((su) => nameFor(SUIT_WORD[su], all.filter((c) => fs.suitOf(c) === su), isGood));
  const byRank = RANKS_WORD.map((word, r) => nameFor(word, all.filter((c) => fs.rankOf(c) === r), isGood));
  return [...bySuit, ...byRank].filter(Boolean).sort((x, y) => y.cards.length - x.cards.length);
}

/** Cards named the way a player would: "a diamond, a queen or an ace". Null when no short description fits. */
function sayCards(fs, good, all) {
  if (!good.length) return null;
  const picked = []; const covered = new Set();
  for (const k of candidates(fs, new Set(good), all)) {
    const fresh = k.cards.filter((c) => !covered.has(c)); if (fresh.length < 2 && picked.length) continue;
    picked.push(k.name); k.cards.forEach((c) => covered.add(c)); if (covered.size >= 0.7 * good.length || picked.length >= 3) break;
  }
  if (!picked.length || covered.size < 0.6 * good.length) return null;
  return picked.length === 1 ? picked[0] : `${picked.slice(0, -1).join(', ')} or ${picked[picked.length - 1]}`;
}

/** On which cards something holds: "on almost any card", "unless a club comes", "when a queen or an ace comes", or a count. */
export function whichCards(fs, good, bad, all) {
  const share = good.length / all.length;
  if (share >= 0.9) return 'on almost any card';
  if (share <= 0.08) return 'on almost no card';
  const unless = share > 0.6; const said = sayCards(fs, unless ? bad : good, all);
  if (said) return unless ? `unless ${said} comes` : `when ${said} comes`;
  return `on about ${good.length} of the ${all.length} cards`;
}
