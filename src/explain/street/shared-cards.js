// Two hands that cannot both be dealt: they share a card.
import { firstCard, secondCard, holds } from '../../combos.js';

export const sharesCard = (fs, combo, other) => holds(fs, combo, firstCard(fs, other)) || holds(fs, combo, secondCard(fs, other));
