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

## The river derivation, taken apart and rebuilt (`derive.mjs`, `rules.mjs`, `values*.py`)

Each rule was played at one kind of decision only, with the solution everywhere else, to see where the first derivation lost. Then, for every river decision of 40 spots, what betting and what checking each give up was recorded by equity step (`DUMP=values`), and the rule rebuilt from what that showed. The rebuilt rule was tested on 54 spots it had not seen (seeds 33 and 44).

**What was wrong with the first derivation**

- **Facing a bet, it never raised.** Calling everything with the price is the right call line, but gives up 0.7% by not raising the best hands.
- **Checked to, its bluffs spilled into hands that win showdowns.** Taking bluffs "from the bottom up" until the ratio is filled bets hands with 15 to 40% equity, which lose by betting. The bluffs are only the hands that cannot win a showdown.
- **First to act, it bet as if a check were a showdown.** Out of position a check is not the end: he bets his strong hands himself, so when he holds many of them the whole range checks; and weak hands that would win a showdown do not get one, so more of them bet.
- **A fault in the test, not the rule:** where all-in was the only bet on offer the rule was not betting at all. Fixed; the figures below are after the fix.

**The rule now** (inputs: the bet size s; each hand's equity against his range; how much of his range is weak, under 30% equity against yours, and how much is strong, 80% or more)

| Decision | Rule |
|---|---|
| Checked to | Value: 80% equity or more. Bluffs: only hands under 15%, s/(1+s) of a bluff per value bet, weakest first; none if under a tenth of his range is weak. |
| First to act | If over 30% of his range is strong, check everything. Otherwise value from 80% (90% if most of his range is weak), and bet every hand more than a quarter below his weak share. |
| Facing a bet | Call with the price, s/(1+2s). Raise from 85%. |
| Facing a raise | Continue with the price. |

**What it gives up on the river** (% of the pot, unseen spots; seed 44, 30 spots, in brackets seed 33, 24 spots)

| | First derivation | Rebuilt |
|---|---|---|
| Betting (checked to and first to act) | 0.77 (0.79) | 0.42 (0.44) |
| Facing a bet | 0.70 (0.74) calling with the price; about 0.85 keeping the top 1/(1+s) | 0.14 (0.18) |
| Facing a raise | 0.22 keeping the top 1/(1+s) | 0.04 (0.04) |
| **Whole river** | about 1.8 | **0.63 (0.68)** |

For comparison, on the river: the best three bands found from the solution give up 0.79, the 13x13 grid 0.91, frequencies alone 9.1. By pot type (seed 33): single-raised 0.65, 3-bet 0.70, 4-bet 0.62, squeezed 0.77.

**What the values showed about the structure**

- Per decision, a few strength steps played all-or-nothing lose almost nothing (4 to 8% of the first rule's loss). So the lines are the whole answer; the work is predicting where they fall spot by spot.
- **Whether the weak hands bluff is set by his weak share.** First to act, with under a fifth of his range weak nothing bluffs; at 30 to 45% the hands under 15% bluff; at 45 to 60% the hands under about 25%; at 60% and over everything under 45% bets, and value starts at 90%.
- **Bluffing spots are over-folding spots.** Where bluffing the weakest hands wins, he folds 57 to 62% (a 75% bet needs 43%): he has too little to defend. Where it does not, he folds 42 to 43%, exactly the break-even, and the bluffs are a mix.
- **Which weak hands bluff matters little.** Choosing them by blockers, or even as the solution does, moved the loss by 0.1 to 0.2.

A cleaner single-quantity version (one fold share f, value from (1+f)/2, bluffs under f(1+s)-s, solved by going round) was tried and did no better (`fourth`), so the thresholds above stay as found.

Not done: the same rebuild for the turn (first derivation: 0.9), and for the flop.

## The turn: does the two-street count hold? (`RULES=turn`, `RULES=turn2`, 24 unseen spots, seed 55)

The idea: with a bet still to come, the turn betting range can hold more weak hands than the river ratio allows. Applying the river ratio twice says 67% of a three-quarter-pot betting range is not value (one street: 43%).

**What the solution's turn betting range is made of** (42 betting decisions): 32% from hands with 80% equity or more, 26% from 50 to 80%, 42% from under 50%. So 68% is under the value line: the two-street figure, not the one-street one. But the solution bets only two thirds of its 80%+ hands (13 of 20 points of range), so "every hand over the line, times two" bets 54% of the range where the solution bets 35 to 40%. The ratio holds; the base must be the value that bets, not all the value there is.

Bet frequency by equity, in steps of ten points: 29, 36, 31, 31, 20, 13, 19, 48, 62, 66%. Weak hands bet about a third of the time, the middle a sixth, and value starts near 70%.

**What each rule gives up on the turn** (% of the pot, turn decisions only; how much of the range it bets, the solution betting 35%)

| Rule when betting | Loss | Bets |
|---|---|---|
| First derivation: value from 71%, bluffs from the bottom | 0.42 | 42% |
| Value from 80%, nothing else | 0.19 | 18% |
| Value from 80%, 0.75 weak per value, by most still to come | 0.30 | 33% |
| Value from 80%, 2.06 weak per value (two streets), by most still to come | 0.67 | 54% |
| The same, the weak hands as the solution picks them | 0.43 | 54% |
| Value from 80%, and every hand with 20 points still to come | 0.27 | 24% |

| Rule facing a bet | Loss | Continues (solution 62%) |
|---|---|---|
| Everything with the price | 0.36 | 84% |
| The top 1/(1+s) | 0.23 | 67% |
| Eight points over the price | 0.23 | 71% |

- **This test cannot reward a bluff.** Against an opponent who does not adapt, a weak bet is at best break-even, so every rule that adds weak hands loses a little more than value alone. The count has to be judged by the make-up of the range (above), not by this loss.
- **Value alone is nearly free on the turn** (0.19), and a higher line costs no more (0.18 at 85%).
- **Picking by "still to come" beats picking from the bottom** at every count (0.30 against 0.36; 0.38 against 0.45), and the solution's own picks are better again (0.26 at 1.2 per value).
- **Facing a turn bet, the price is too loose**: there is a river bet to come. Eight points over the price, or the top 1/(1+s), is right. Raising from 85% adds nothing.
- The rules bet one size (three quarters) where the solution has two; that is part of every betting loss here.

## What sets the bet size (`sizes.mjs`, `sizes.py`)

66 turn spots with three sizes on offer on both streets (a third of the pot, three quarters, one and a half), each at one of four stack depths (0.4, 0.7, 1 or 1.5 times the usual stack) so that depth is not tied to pot type. 7,947 betting decisions: 7,837 on the river, 110 on the turn. Size is the mean size of the range's bets, in pots.

**It is a combination.** How much of the size each explains on spots not seen (a rule of three questions | a flexible model):

| What is known | Share of the size explained |
|---|---|
| Street alone | 0% |
| Range advantage alone | 4% \| 2% |
| Stack depth alone | 13% \| 11% |
| Nut advantage alone (shares at 90% equity) | 21% \| 21% |
| Depth, street, nuts | 35% \| 44% |
| The same, and first to act or checked to | 36% \| 49% |
| Everything about the two ranges | 41% \| 74% |

**River: mean size by depth and by who has the nuts**

| Stack behind, in pots | He has them | Even | I have them |
|---|---|---|---|
| under 1.5 | 0.61 | 0.73 | 0.80 |
| 1.5 to 4 | 0.52 | 0.74 | 0.95 |
| 4 to 10 | 0.49 | 0.64 | 0.84 |
| over 10 | 0.48 | 0.67 | 0.77 |

- On the river the nuts set the size at every depth: about half a pot when he has them, about two thirds when even, 0.8 to 0.95 when you do.
- What else goes with a bigger river bet: a polar range of your own (strong hands and air, little in the middle: +0.47), a lot of middling hands in his (+0.43), and few strong hands in his (-0.42).
- On the turn (110 decisions) depth leads (+0.40) and having the range advantage goes with betting smaller (-0.27), as on the flop (experiment 9 of the charts study). The nut gap shows only when deep.
- Value hands and weak hands use the same size (0.75 and 0.81 pots; value is the bigger in 6% of decisions): the size belongs to the range, not to the hand.

## The bet frequency held as a word: what it gives up (`SET=words`, 30 unseen spots, seed 66)

At every decision to bet, the range is moved (hands in the solution's order) until it bets as often as the player thinks it should; facing a bet the solution is played. The word is one of three (mostly check, mixed, mostly bet) and is played at its middle, or 10 or 20 points to one side. The rule is experiment 12 of the charts study. % of the pot:

| What the player holds | Turn | River |
|---|---|---|
| Always 40% | 0.43 | 1.23 |
| The rule's number | 0.21 | 0.71 |
| The rule's word, at its middle | 0.21 | 0.73 |
| The rule's word, 20 points low / high | 0.16 / 0.33 | 0.73 / 1.12 |
| The rule's word, 10 points low / high | 0.16 / 0.26 | 0.65 / 0.90 |
| The right word, at its middle | 0.15 | 0.51 |
| The right word, 20 points low / high | 0.10 / 0.31 | 0.63 / 0.94 |
| The right word, 10 points low / high | 0.10 / 0.23 | 0.47 / 0.67 |

- A word costs nothing over the number it came from (0.21 and 0.73 against 0.21 and 0.71).
- A meaning 20 points loose adds up to 0.1 on the turn and 0.4 on the river, and only on the high side: when betting, too often costs more than too seldom. (The errors study's "too passive is dearer" was mostly folding too much when facing a bet.)
- The rule's word is about 0.1 to 0.2 behind the right word, and half of what always saying 40% gives up.
- The figures in experiment 13 of the charts study (1.2 to 1.9) were read off the errors study's rates and are too high.
