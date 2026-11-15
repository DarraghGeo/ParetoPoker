# What a picture of a strategy is worth

A player who learns a spot from a chart holds a summary of it. `worth.mjs` turns each summary back into a strategy (every hand of a group plays the group's average), plays it in one seat against the solver's own strategy in the other, and scores what it gives up. 61 turn spots with the preset ranges (26 4-bet, 18 3-bet, 15 single-raised, 2 squeezed), two bet sizes on the turn and one on the river, raises allowed; the turn decisions and the river decisions scored apart. `report.py` prints the tables.

Loss is a percentage of the pot, per seat, against an opponent who plays the solution and does not adapt. A summary is also easier to exploit than the solution; that is not measured here.

## What each summary gives up

| What the player holds | Turn decisions | River decisions |
|---|---|---|
| Each hand's commonest action (no mixing) | -0.02 | 0.07 |
| The range's frequencies only (which hands do it unknown) | 5.86 | 9.09 |
| 2 bands by strength, cut in the best place | 1.12 | 2.21 |
| 3 bands by strength, cut in the best places | 0.69 | 0.79 |
| 5 bands by strength, cut in the best places | 0.42 | 0.34 |
| 5 equal fifths by strength (cuts not chosen) | 0.68 | 1.25 |
| Hand types as a coach names them (about ten groups) | 0.56 | 1.85 |
| 3 bands, each split by drawing or not | 0.43 | 0.79 |
| Strength in three by drawing or not, fixed cuts | 0.84 | 2.51 |
| The 13x13 grid (169 hand classes) | 0.77 | 0.91 |

- **Mixing is worth nothing.** Playing each hand's commonest action every time gives up nothing against the solution.
- **Frequencies alone are worth almost nothing.** Knowing that the range bets 40% without knowing which hands gives up 6 to 9% of the pot.
- **Three well-placed bands are worth as much as the grid's 169 cells** (0.69 and 0.79 against 0.77 and 0.91). Five bands beat it on both streets.
- **Where the cuts fall is the knowledge.** Five equal fifths give up more than three chosen bands on the river (1.25 against 0.79).
- **A draw split helps on the turn** (0.69 to 0.43) and does nothing on the river.
- **Hand types are a poor guide on the river** (1.85): strength against his range matters there, not the name of the hand.

## What mistakes cost (`SET=errors`, 60 spots)

| Mistake, across the whole range | Turn | River |
|---|---|---|
| Every hand 10 points too aggressive | 0.25 | 0.70 |
| Every hand 10 points too passive | 1.22 | 1.35 |
| Every hand 20 points too aggressive | 0.50 | 1.38 |
| Every hand 20 points too passive | 2.45 | 2.70 |
| One bet size only (the commonest) | 0.02 | 0.09 |

- **Passivity costs about five times what aggression costs on the turn, and twice on the river.**
- **Size barely matters** when the hands are right: one size gives up 0.02% on the turn, where two sizes were on offer. (The river had one size, so its figure is about raises.)
- **A frequency that is 10 points out costs less than a wrong band structure**: 0.25 to 1.35 against 2.21 for two bands in place of three on the river.

## What this says for teaching

1. Teach **where the lines fall on the range**, not the frequency and not each hand's mix.
2. Ask for **the commonest action**, never "which actions can it take".
3. Drop sizing as a thing to drill until the lines are known.
4. Warn against passivity first: it is the expensive direction.
5. On the turn, add the draw question; on the river, drop hand names for strength against his range.

Limits: turn spots with starting ranges, not ranges after flop betting; no flop decisions; an opponent who does not adapt.

## Can the lines be derived at the table? (`SET=derived`, 40 spots)

The simplest derivation a player could do, from two inputs: the bet size, and where each hand stands against his range.

- **Facing a bet of s pots:** continue with the top 1/(1+s) of the range (57% against a 75% bet).
- **Betting s pots:** he continues with the top 1/(1+s) of his range, so a value bet must beat half of that: hands with 1 - 1/(2(1+s)) equity or more (71% for a 75% bet). Add s/(1+s) of a bluff for each value bet, from the bottom of the range. Check the rest.

| What the player plays | Turn | River |
|---|---|---|
| The range's frequencies only (from above) | 5.86 | 9.09 |
| **The derivation, both when betting and when facing a bet** | **0.90** | **2.03** |
| The derivation when betting, the solution when facing a bet | 0.44 | 1.44 |
| The solution when betting, the derivation when facing a bet | 0.40 | 0.85 |
| The derivation with no bluffs | 0.70 | 2.06 |
| Value from 60% equity / from 80% | 1.31 / 0.77 | 2.55 / 1.79 |
| Continuing with ten points more than the price asks | 1.08 | 2.56 |
| The best three bands (needs the solution) | 0.69 | 0.75 |

- The derivation gets most of the way from knowing nothing about which hands (5.9 and 9.1) to the best lines (0.7 and 0.75): it gives up 0.9 on the turn and 2.0 on the river.
- On the turn it is nearly as good as the best three bands. On the river it leaves 1.3 points that the two inputs do not explain, mostly in when to bet.
- Erring towards a tighter value line (80%) costs less than a looser one (60%). Leaving the bluffs out costs nothing against an opponent who does not adapt.
