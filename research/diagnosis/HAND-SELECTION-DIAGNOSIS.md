# Hand selection: how hands are chosen for their action

A diagnosis of the solver's hand selection on rivers and turns, by the six steps: value or
bluff, must / may / can't, interchangeable or not, what makes twins, how the features rank, and
what the spot changes. Nothing in the engine was changed by this run.

Run of 2026-11-13. Every number is from the solver's own solutions; "loss" is always to the
solver's best response, as a share of the pot, unless it says otherwise.

## Method

**Data** (`diagnosis/hands.mjs`, read by `diagnosis/hands_load.py`). Every hand at every decision
of the first street of each tree, on lines both players take at least 3% of the time: first to
act, facing a bet, facing a raise.

| set | trees | decisions | used for |
|---|---|---|---|
| rivers-tune, rivers-held | 72 + 48 | 621 + 420 | rivers (tables use both unless they say so) |
| turns-tune, turns-more, turns-held2 | 16 + 32 + 16 | 132 + 274 + 136 | turns |

For each hand: the solver's strategy, **what each action is worth to it** (new in the bridge:
`strategy(history, { evs: true })`), its equity against his range, its rank in hero's range,
strength now, draw equity, swing, E[HS2], best card, upside, downside, implied odds, spread,
slope, made-hand and draw class, blockers (how much of his best quarter, worst quarter and whole
range it removes; and, from his solved answer, how much of his folding and continuing range).
For each decision: bet faced, stack to pot, range and nut advantage, air shares, board texture,
the solver's frequencies, both equity curves.

**Must / may / can't.** An action is a mistake for a hand when it gives up more than 0.5% of
the pot against the hand's best action (the solver's values against the equilibrium). A hand
*must* bet when not betting is a mistake, *can't* when betting is, and *may* (optional)
otherwise. This is a statement about one hand against the equilibrium; it is not a statement
about what the range may do, which is what the next test measures.

**Interchange test** (`diagnosis/v54.mjs`, `hands: 'solver-by-groups'` in `SolverMatch`). His
range, the frequencies and the mixing are the solver's. Hands that a grouping puts together all
play the average of the solver's strategy over the group, and the solver best-responds. What a
grouping loses is what telling its hands apart is worth; a grouping that loses nothing has found
the twins. Lines he takes under 1% of the time are left to the solver (his range there is noise).
The floor is the solver's own exploitability, 0.30% on rivers and 0.40% on turns.

**Feature models** (`hands_2_features.py`). Boosted trees fitted on the tuning boards and scored
on other boards: how much of the solver's choice a set of features explains.

**Worth models** (`hands_4_advantage.py`). How much better one action is than the other for
each hand, against the features, one at a time and together, with spot interactions.

Outputs are in `diagnosis/hands/` (the raw per-hand files are large and not committed; they are
rebuilt by `node diagnosis/hands.mjs <set> diagnosis/hands/<set>.jsonl`, about a minute a set).

## The short version

1. **On the river a hand is its equity against his range, and nothing else.** Hands with exactly
   the same equity are interchangeable: giving them one shared strategy loses 0.29% (the floor is
   0.30%). Blockers matter only through that equity; as a feature of their own they add nothing.
2. **Must / may / can't does not tell you who the twins are.** Treating all hands with the same
   set of acceptable actions alike loses 10% on rivers and 9% on turns. Optional hands are
   indifferent one at a time, but the range is not indifferent to which of them act.
3. **What the river needs is resolution in equity and the right mix at each level of it.** The
   loss falls as hands are told apart more finely by equity (7.5% with 5 bands, 1.6% with 20,
   0.4% with 100), and playing every equity level pure loses 8%.
4. **Pure cuts on equity are nearly enough everywhere on the river except out of position first
   to act.** With the solver's frequencies: facing a raise 0.5%, facing a bet 1.4%, in position
   first to act 1.7%, out of position first to act 9.1%. There the strong hands must also check,
   and a single checking share for all value hands only brings it to 6.5%.
5. **On the turn a hand is the distribution of its river equities.** Hands whose equity over
   the river cards has the same distribution are twins, whichever cards bring it: 100 such
   groups lose 0.49% (floor 0.40%) where 100 bands of average equity lose 1.22%. Strength now
   with draw class, the engine's current "kinds", does worse than plain equity at the same
   number of groups. As on the river, the groups must still be mixed (pure loses 8%).
6. **The spot moves the thresholds, not the ranking.** Which feature ranks hands is the same
   everywhere; range and nut advantage move how far down value goes, how far up bluffs go and how
   often the top checks. On rivers the von Neumann thresholds computed from hero's equity curve
   alone track the solver's across 120 spots (correlation 0.84 to 0.93 in position).

## River

### 1. Value or bluff, and the shape

First to act, how often the solver bets by the hand's equity against his range (0-10% ... 90-100%):

| | 0-10 | 10-20 | 20-30 | 30-40 | 40-50 | 50-60 | 60-70 | 70-80 | 80-90 | 90-100 |
|---|---|---|---|---|---|---|---|---|---|---|
| in position | 0.63 | 0.29 | 0.12 | 0.03 | 0.00 | 0.01 | 0.02 | 0.44 | 0.88 | 1.00 |
| out of position | 0.49 | 0.31 | 0.05 | 0.01 | 0.01 | 0.14 | 0.69 | 0.73 | 0.63 | 0.47 |

In position it is the textbook shape: bluff the bottom, check the middle, bet the top. Out of
position value starts lower (from about 60%), and the strongest hands bet *less* than the hands
under them: the top tenth of the range checks half the time. Out of position the big size goes
to the bluffs and the very top, the small size to the middle of the value range.

Facing a bet or raise, by the hand's equity minus the pot odds:

| equity minus pot odds | share of range | fold | call | raise |
|---|---|---|---|---|
| under -2 points | 19-31% | 0.92-1.00 | 0.00-0.03 | 0.00-0.08 |
| within 2 points | 44-52% | 0.41-0.56 | 0.41-0.57 | 0.00-0.07 |
| +2 to +40 points | 10-20% | 0.00-0.04 | 0.88-1.00 | 0.00-0.09 |
| over +40 points | 9-23% | 0.00 | 0.33-0.79 | 0.21-0.67 |

About half the range facing a bet is a bluff-catcher within two points of the price. Inside
that band the solver's calling rises steadily with the last fractions of equity: by fifths of
the band, 0.18 / 0.34 / 0.51 / 0.72 / 0.91 in position and 0.06 / 0.23 / 0.39 / 0.63 / 0.91 out of
position. Those fractions of equity are the blockers.

### 2. Must, may, can't (share of the range)

| decision | must bet or raise | may | can't | must continue | may | can't |
|---|---|---|---|---|---|---|
| first to act, in position | 0.43 | 0.15 | 0.41 | | | |
| first to act, out of position | 0.24 | 0.34 | 0.42 | | | |
| facing a bet, in position | 0.18 | 0.18 | 0.43 | 0.52 | 0.20 | 0.28 |
| facing a bet, out of position | 0.08 | 0.11 | 0.48 | 0.38 | 0.20 | 0.42 |
| facing a raise, in position | 0.02 | 0.03 | 0.54 | 0.36 | 0.26 | 0.39 |
| facing a raise, out of position | 0.02 | 0.05 | 0.38 | 0.39 | 0.28 | 0.34 |

(Bet-or-raise shares do not add to 1 where raising is not offered.)

- In position first to act, the top fifth is all must (not betting costs 14% to 33% of the pot)
  and **the bottom tenth is 78% must**: checking the worst hands costs 8% of the pot. Bluffing
  with the bottom is not optional there. The optional hands sit at the two edges: 10-20% and
  60-70% of the range.
- Out of position first to act, a third of the range is optional and nothing above the middle
  is strongly must (1% to 2% of the pot): betting or checking a strong hand is worth nearly the
  same to the hand.
- Facing a bet, everything more than two points clear of the pot odds is must or can't. "Continue
  when equity beats the pot odds" agrees with the solver for 89-90% of the range, and for 95-96%
  of the hands that are not optional.

### 3. Interchangeable? (the test)

rivers-tune, loss in % of the pot (rivers-held in brackets where run):

| grouping | groups | loss |
|---|---|---|
| everything alike | 1 | 39.6 |
| made-hand class | ~9 | 11.5 |
| status (same acceptable actions, 0.5%) | up to 16 | 10.0 (9.5) |
| status, 2% | | 6.4 |
| equity, 5 bands | 5 | 7.5 |
| equity, 10 bands | 10 | 3.2 (3.2) |
| equity, 20 bands | 20 | 1.6 (1.6) |
| equity, 50 bands | 50 | 0.66 (0.72) |
| equity, 100 bands | 100 | 0.37 (0.41) |
| **exactly equal equity** | ~100-160 | **0.29 (0.32)** |
| equity 25 bands x blockers 2 | 50 | 0.91 (0.95) |
| equity 50 bands x blockers 2 | 100 | 0.50 (0.54) |
| equity 25 bands x blockers 4 | 100 | 0.61 |
| equity 20 bands x made-hand class | ~100 | 1.04 |
| status x equity 5 bands | | 2.4 |
| the solver itself | | 0.30 |

- Hands with exactly equal equity are twins. That is the whole answer to steps 3 and 4 on the river.
- At an equal number of groups, splitting by blockers is worse than splitting equity finer
  (0.91 against 0.66 at 50 groups; 0.50 and 0.61 against 0.37 at 100). The blocker feature
  carries no information that exact equity against his range does not already hold.
- Knowing each hand's status is worth much less than knowing its equity to 5%.
- Our selector's order and the plain equity order both reach the floor when the solver's play
  is laid along them finely (0.35% and 0.46% at 100 bands, 0.25% both at 300): on the river
  there is nothing left to find in the *order*.

**But the hands of one equity level must still be mixed.** Each exact-equity group playing its
most frequent action outright loses 8.5% (8.2% held-out). About 40% of the range is mixed by the
solver, and pooling tied hands does not reduce that: the mixing is across equity levels, a ramp,
not a tie-break.

How much pure cuts lose when the frequencies are right (`diagnosis/v55.mjs`: the solver's
frequencies, value from the top down, calls next, bluffs from the bottom up, no mixing):

| decisions cut pure | out of position | in position |
|---|---|---|
| facing a raise | 0.58 | 0.46 |
| facing a bet | 1.03 | 1.79 |
| first to act | 9.11 | 1.65 |
| all | 11.14 | 3.09 |

Out of position first to act is the one river decision where the shape matters a great deal.
Having every value hand bet the same share of the time (0.9 down to 0.5) brings 9.1% only to
6.5% at best (0.6-0.7), so the solver's checking range there is not a uniform trap.

### 4 and 5. Which features, in what order

Rank correlation of each feature with what the action is worth to the hand:

| | equity (edge over odds when facing) | equity vs his best quarter | spread | blocks his best over his worst | all blockers |
|---|---|---|---|---|---|
| betting, in position | +0.49 | +0.70 | +0.64 | +0.31 | -0.35 |
| betting, out of position | +0.24 | +0.27 | +0.38 | +0.18 | -0.06 |
| continuing vs a bet, in position | +0.96 | +0.68 | +0.09 | +0.68 | +0.23 |
| continuing vs a bet, out of position | +0.98 | +0.62 | +0.01 | +0.73 | +0.25 |

- Facing a bet, the worth of continuing is 98% explained by a straight line in the hand
  features, and that line is equity over the pot odds. Blockers correlate (+0.7) because they
  *are* the equity differences among bluff-catchers; given equity their weight is zero.
- The feature models say the same on other boards: rank in range and the frequencies explain
  85-87% of the solver's calling and raising (83-87% for calling, 77-87% for raising); equity, spread,
  blockers and the spot together add 1 to 5 points. For **raising**, the one feature that adds is equity against the range that
  *calls* the raise (from his solved answer), +2 to +5 points.
- First to act in position: rank and frequencies 85%, everything else up to 91%. Out of
  position: 61%, rising to 79% with blockers and the spot. The out-of-position open is the
  least determined by simple features, in line with the pure-cut test.

### 6. What the spot changes

Per decision, the lowest value bet and the highest bluff (in equity), across 120 spots each:

| | solver | von Neumann from the equity curve | correlation |
|---|---|---|---|
| in position: lowest value bet | 0.79 | 0.76 | 0.84 |
| in position: highest bluff | 0.09 | 0.13 | 0.93 |
| in position: bet frequency | 0.49 | 0.60 | 0.13 |
| out of position: lowest value bet | 0.69 | 0.72 | -0.11 |
| out of position: highest bluff | 0.11 | 0.15 | 0.78 |
| out of position: bet frequency | 0.42 | 0.46 | 0.86 |

The von Neumann thresholds are from Ferguson and Ferguson, section 5.3 (the bettor's hands as
percentiles against the caller's range): `b` solves `F((B+2)b - (B+1)) = B/(B+2) (1 - F(b))`
with `F` hero's equity distribution and `B` twice the bet as a share of the pot; value above
`b`, bluffs below `a = (B+2)b - (B+1)`. No solving, only hero's equity curve and the bet size.
In position it finds where value starts and where bluffs stop. Out of position it finds the
frequency and the bluffs but not where value starts, because the model has no checking range
to protect.

What moves the thresholds (rank correlation across spots):

| | range equity | nut advantage | hero's air | his air | bet size |
|---|---|---|---|---|---|
| in position: lowest value bet | +0.63 | +0.76 | -0.60 | +0.60 | +0.37 |
| in position: highest bluff | +0.89 | +0.82 | -0.86 | +0.85 | -0.03 |
| out of position: highest bluff | +0.79 | +0.84 | -0.63 | +0.59 | +0.51 |
| out of position: bet frequency | +0.83 | +0.90 | -0.54 | +0.52 | +0.50 |
| out of position: top tenth checks | -0.69 | -0.78 | +0.46 | -0.40 | -0.57 |

With the range and nut advantage, more hands bluff and the top checks less. By pair of ranges
out of position: the 3-bettor (C) bets 57% and checks its top 32%; the big blind against the
button (B) bets 22% and checks its top 71%. The ranking of hands is the same in every spot; the
spot sets where the cuts fall and how much the top is held back.

## Turn

All turn tests group hands at the turn decisions only and leave the river to the solver, unless
they say "whole tree". Floor 0.40%.

### 1. Value or bluff, and the shape

First to act, how often each kind bets (strength now as rank in the range, by draw):

| in position | 0-20 | 20-40 | 40-60 | 60-80 | 80-90 | 90-100 |
|---|---|---|---|---|---|---|
| no draw | 0.62 | 0.29 | 0.12 | 0.41 | 0.67 | 0.85 |
| gutshot | 0.53 | 0.41 | 0.24 | 0.49 | 0.86 | 1.00 |
| strong draw | 0.54 | 0.51 | 0.23 | 0.69 | 0.98 | 0.95 |
| nut draw | 0.62 | 0.61 | 0.49 | 0.79 | | 0.82 |

| out of position | 0-20 | 20-40 | 40-60 | 60-80 | 80-90 | 90-100 |
|---|---|---|---|---|---|---|
| no draw | 0.25 | 0.12 | 0.13 | 0.33 | 0.47 | 0.35 |
| gutshot | 0.45 | 0.27 | 0.13 | 0.30 | 0.55 | 0.74 |
| strong draw | 0.63 | 0.32 | 0.06 | 0.35 | 0.42 | 0.49 |
| nut draw | 0.56 | 0.28 | 0.09 | 0.08 | | 0.06 |

The same U as the river (weak and strong bet, the middle checks), flatter, with draws betting
more than made hands of the same strength when weak. Out of position the top again bets less
than the hands under it.

Facing a bet, raw equity over the pot odds is not enough. Hands with no draw need about 10
points more than the pot odds in position and 15 out of position; strong and nut draws
continue at the pot odds or below (-2 and 0). Among the hands near the line (10 points under
to 5 over), in position: no draw continues 5% of the time, gutshots 44%, strong draws 72%, nut
draws 84%. By quarters of draw equity 0.02 / 0.08 / 0.20 / 0.69, of swing 0.01 / 0.08 / 0.31 /
0.59, of strength now 0.55 / 0.19 / 0.14 / 0.10. Blockers do nothing there (0.27 / 0.25 / 0.21 /
0.25).

### 2. Must, may, can't (share of the range)

| decision | must bet or raise | may | can't | must continue | may | can't |
|---|---|---|---|---|---|---|
| first to act, in position | 0.14 | 0.65 | 0.21 | | | |
| first to act, out of position | 0.05 | 0.72 | 0.23 | | | |
| facing a bet, in position | 0.03 | 0.33 | 0.58 | 0.55 | 0.17 | 0.28 |
| facing a bet, out of position | 0.04 | 0.28 | 0.65 | 0.49 | 0.15 | 0.35 |
| facing a raise, in position | 0.03 | 0.18 | 0.39 | 0.60 | 0.08 | 0.32 |
| facing a raise, out of position | 0.04 | 0.25 | 0.35 | 0.66 | 0.10 | 0.24 |

First to act on the turn, two thirds to three quarters of the range is optional, in every band
of strength. Only the top tenth in position is mostly must (53%), and a must there costs 5% of
the pot against 14% to 33% on the river. Per kind (table in `hands/6-turn-shape.txt`), the only
kinds that are mostly must are strong hands that also hold a draw. The solver plays only about
half the range pure. This is why fitting the engine to the solver's individual turn opens has
been unstable: for most hands either action is right for the hand, and the choice is the
range's.

Continuing against a bet or raise is much more settled: 8% to 17% optional.

### 3. Interchangeable? (the test)

turns-tune, turn decisions only, loss in % of the pot (turns-held2 in brackets):

| grouping | groups | loss |
|---|---|---|
| everything alike | 1 | 42.1 |
| status (same acceptable actions, 0.5%) | | 9.2 |
| status x draw class | | 7.3 |
| equity, 10 bands | 10 | 5.90 |
| equity, 20 bands | 20 | 4.21 (4.20) |
| equity, 50 bands | 50 | 2.32 (2.50) |
| equity, 100 bands | 100 | 1.22 |
| strength now 10 bands x draw class (the engine's kinds, finer) | ~40 | 4.34 |
| E[HS2], 20 bands | 20 | 4.46 |
| equity on every river card, 20 clusters | 20 | 3.13 (3.50) |
| equity on every river card, 50 clusters | 50 | 1.40 (1.46) |
| equity on every river card, 100 clusters | 100 | 0.63 |
| **distribution of river equities, 50 clusters** | 50 | **1.04** |
| **distribution of river equities, 100 clusters** | 100 | **0.49** |
| the solver itself | | 0.40 |

"Equity on every river card" clusters hands by the vector of their equity on each of the 46
rivers (k-means from equity bands). "Distribution" sorts that vector first, so that only how
much equity the hand gets and how it is spread counts, not which cards bring it.

- The distribution does better than the card-by-card profile at the same number of clusters,
  and reaches the floor at 100. **Which river cards help a hand does not matter; how its equity
  is distributed over them does.** Two hands with the same distribution are twins.
- Average equity is one number from that distribution, which is why finer equity bands keep
  helping but stay about twice as far from the floor.
- Whole tree (turn by clusters of the profile, river by 50 equity bands): 1.72 against 2.61
  for 50 equity bands on both streets. Our selector's order with the solver's mixing in 20 bands
  was 5.07.

The second feature next to equity, 10 equity bands x 5 bands of the feature (50 groups; 10
equity bands alone 5.90, 50 equity bands 2.32):

| second feature | loss |
|---|---|
| best card (equity on its best river) | 2.37 |
| draw equity | 2.93 |
| swing | 2.96 |
| draw class (4 classes) | 3.02 |
| blockers | 3.32 |
| implied odds proxy | 3.60 |
| E[HS2] | 4.14 |
| strength now | 4.18 |

No single second feature at this resolution beats simply cutting equity five times finer
(2.32); the best card comes level. Finer equity with a coarse second feature does not either:
25 equity bands x 2 of draw equity 2.81, x 2 of swing 3.06, 17 x 3 of draw equity 3.03 (all 50
groups, against 2.32), and 25 equity bands x draw class 1.69 (up to 100 groups, against 1.22). The full distribution is what beats it (1.04). In order of
use next to equity: the hand's best river, then how much of its equity comes from behind, then
swing and draw class. Strength now, the axis the engine's kinds are built on, is the least
useful of them.

By kind of decision, 50 groups:

| turn decisions grouped | equity bands | river-equity profile |
|---|---|---|
| first to act | 1.76 | 1.04 |
| facing a bet | 1.32 | 0.77 |
| facing a raise | 0.37 | 0.33 |

Facing a raise, average equity is enough. First to act and facing a bet are where the
distribution matters.

Mixing is as necessary as on the river: each group playing its most frequent action outright
loses 7.9% (100 equity bands) and 8.2% (100 profile clusters).

### 4 and 5. Which features, in what order

- **Continuing against a bet or raise**: what it is worth to the hand is 95-97% a straight line
  in the hand's features. The line is equity over the pot odds, with strength now counted
  *against* the hand at equal equity (weights per SD, in position facing a bet: edge +26, equity
  +26, strength now -20, spread +11, draw equity -8): of two hands with the same equity, the one
  whose equity is still to come is worth more than the one that has it now. Feature models on
  held-out boards: rank and frequencies 70-71% facing a bet, equity adds 10 points, what the
  hand becomes adds 4 more; nothing else adds.
- **Raising**: the least determined action (43-67% explained by everything together). It leans
  on equity against the range that calls the raise and on strength now. By equity rank the
  solver raises 4% of its weak hands and 31-41% of its best; by draw, 11-12% of no-draw hands and
  18-37% of strong and nut draws.
- **Betting first to act**: hand features explain only 21-32% of what betting is worth, because
  it is worth nearly nothing either way for most hands (sd 1-2% of the pot). Models of the
  solver's choice reach 49% in position and 67% out of position; out of position the largest
  single input is how often the range bets.

### 6. What the spot changes

Facing a bet, the extra equity a no-draw hand needs over the pot odds:

| | mean | sd across spots | by pair A / B / C / D |
|---|---|---|---|
| facing a bet, in position | +10 | 5 | 10 / 12 / 10 / 10 |
| facing a bet, out of position | +15 | 6 | 16 / 14 / 20 / 14 |
| facing a raise, in position | +12 | 10 | 14 / 10 / 10 / 11 |
| facing a raise, out of position | +15 | 13 | 18 / 10 / 16 / 13 |

It moves weakly with the stack behind (+0.24 to +0.32 facing a bet) and hardly with range or
nut advantage. For draws the requirement falls with the size of the bet faced (-0.65 to -0.68).
Position is the clearest effect: five points more out of position.

First to act, how often each kind bets against how often the range bets (rank correlation
across spots):

| | weak | middle | good | top | strong draws |
|---|---|---|---|---|---|
| in position | +0.82 | +0.74 | +0.52 | +0.79 | -0.02 |
| out of position | +0.80 | +0.87 | +0.95 | +0.97 | +0.75 |

Out of position every kind moves with the range's frequency, which follows range and nut
advantage (+0.8 to +0.9): the spot sets one level and the kinds scale with it. By pair: the
3-bettor bets 72% and its top 74%; the big blind against the button bets 9% and its top 17%. In
position the draws bet about 57% whatever the range does, and bet more with deeper stacks
(+0.72). The share of the range that is optional is the same in every spot (0.66 and 0.74, sd
0.10 and 0.16).

## What this says about the selector

Not built; these are what the measurements point to.

1. **River: rank by exact equity against his range and stop looking for other features.** The
   order is already at the floor. Every point still lost on the river with the right
   frequencies is in the shape laid along that order, and most of that is out of position first
   to act.
2. **River facing a bet or raise: pure cuts are close enough** (0.5% and 1.4% with the right
   frequencies). Raise from the top, call next; the bluff-catchers are cut by their last
   fractions of equity, which is what blockers are.
3. **River out of position first to act needs a checking range that holds strong hands**, and a
   single checking share is not it. This is the one river shape worth a study of its own.
4. **Turn: replace strength now x draw class by the distribution of river equities.** The
   engine already computes equity on every next card for its features. A hand's kind should be
   where that distribution sits: its mean, its best river and how much comes from behind are the
   three numbers that carry most of it.
5. **Turn calling: equity over the pot odds, discounted for hands with nothing to come.** About
   10 points in position and 15 out of position for a hand with no draw, none for strong draws.
6. **Do not fit turn opens hand by hand.** Two thirds of the range is optional there. What has
   to be right is the mix of each kind, and the kinds have to be the right ones (point 4).
7. **Must / may / can't is not a hand-selection tool.** It says where a mistake is expensive
   for one hand. It does not say which hands can stand in for each other.

## From the papers

- **Ferguson and Ferguson, "On the Borel and von Neumann Poker Models"** (read in full). The
  thresholds of section 5.3 were tested above. Two of its statements match what the solver does:
  the bettor is indifferent only at the thresholds while the caller is indifferent over a whole
  band (the 44-52% of bluff-catchers), and with two bet sizes the worst hands bluff with the big
  size while the small size takes the merged middle (the out-of-position river sizes).
- **Acevedo, "Modern Poker Theory"** (read afterwards: the game-theory sections of chapter 2 and
  chapters 10, 13 and 14, from the PDF's text; its formulas and charts are images and were not
  available). Where it meets the measurements:
  - Agrees: mixing cannot be replaced by a pure split at the same frequency; out of position
    part of the strongest range is checked to protect the checking range; allowing raises lowers
    the bet frequency (its toy game goes from about 44% to 30% of the range betting) and deeper
    stacks and traps lower it further; alpha and the minimum defence assume a bluff is worth
    nothing when it checks, so the defender may fold more when it is not.
  - Differs in wording, not in substance: it ranks otherwise equal bluff-catchers and bluffs by
    blockers. Our equity is against his range at the decision with the hand's own cards removed,
    which is the same information; the test says no feature beyond that equity is needed.
  - Does not address: grouping turn hands by the distribution of their river equities (it uses
    four equity buckets and draw classes), or a must / optional classification.
  - Ideas from it not yet tested here: whether nut blockers are better bluffs than equal-equity
    hands when his range holds traps and stacks are deep; which hands take which size (hands he
    cannot hold in the largest size, overlapping value in the small one); the checked share of
    strong hands against stack depth; whether what a hand loses when raised predicts turn checks.

## Files

| file | what |
|---|---|
| `diagnosis/hands.mjs` | builds the per-hand data |
| `diagnosis/hands_load.py` | loads it; defines must / may / can't |
| `diagnosis/hands_1_status.py` | step 2, by equity rank |
| `diagnosis/hands_2_features.py` | feature models on held-out boards |
| `diagnosis/hands_3_river_shape.py` | river shape, thresholds, von Neumann |
| `diagnosis/hands_4_advantage.py` | what each action is worth, features and spot interactions |
| `diagnosis/hands_5_ties.py` | tied equities and mixing on rivers |
| `diagnosis/hands_6_turn_shape.py`, `hands_7_turn_spots.py` | turn shape and spot dependence |
| `diagnosis/v54.mjs` | interchange test by any grouping |
| `diagnosis/v55.mjs` | pure cuts on equity (rivers) |
| `diagnosis/hands/*.txt` | every output quoted here |
