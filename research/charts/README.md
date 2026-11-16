# Charts for study: what a picture can and cannot imply

Four experiments on 8,435 solved decisions (132 flops with their turns and rivers; 4-bet, 3-bet, single-raised and squeeze pots; the hand-by-hand collections of `research/insight`). No people were tested: these measure whether the answer is *in* a picture, in few enough pieces to hold in mind, not whether people learn from it. Run `python3 load.py`, then `exp1.py` to `exp4.py`; results in `out/`.

## 1. Does the picture imply what the range does? (`exp1.py`)

Each chart is reduced to the few numbers a viewer could read off it. A rule three questions deep (about what a person can hold) and a flexible model (the ceiling) then give the solver's answer on flops they have not seen.

| What the viewer has | Bet frequency: simple rule off by / ceiling | Continue frequency facing a bet: simple rule / ceiling |
|---|---|---|
| The situation only (street, bet faced, stack, seat) | 16.2 pts / 15.5 | 9.7 / 9.2 |
| Average equity of each range | 15.8 / 14.3 | 7.0 / 5.2 |
| Equity curve of own range (five points) | 14.1 / 10.8 | **6.4 / 3.8** |
| Four-box card, both ranges | 13.5 / **9.0** | 8.3 / 5.5 |
| Two strips, four landmarks (tops and bottoms) | **13.3** / 10.1 | 8.3 / 5.8 |
| Best single landmark found by search | 13.0 (who has more hands above 70% equity) | 7.0 (own average equity against his bets) |
| Everything, flexible model | 7.7 | 3.9 |

- Two aligned ranges beat one equity curve for **betting**; the best single thing to show is the gap in hands above about 70% equity. Marking the very top (90%+) separately added nothing.
- For **facing a bet** the one-range curve is better: what matters is where the range sits against the price, not his shape.
- No picture of the two ranges gets a simple rule closer than about 12 points on bet frequency. A picture shows the direction (mostly check, mixed, mostly bet: right 71% of the time, against 63% from the situation alone), not the number.
- **Bet size cannot be read off any of them** (223 flops: 14 to 15 points of pot off, barely better than knowing nothing).

## 2. Do the hands fall in bands on a strip? (`exp2.py`)

Sort the range by a key, cut it at the best places into k bands, and measure how much of what the hands do the bands account for. Decisions with real mixing only (2,500).

| Decision | Strip by equity, 2 / 3 / 5 bands | Coach's hand types (about 9 groups) | The 13x13 grid (about 30 cells in play) |
|---|---|---|---|
| Facing a bet, flop | 69% / 75% / 83% (80% / 86% / 92% with the draw added to equity) | 63% | 73% |
| Facing a bet, turn | 82% / 88% / 93% | 75% | 80% |
| Facing a bet, river | 88% / 96% / 98% | 61% | 87% |
| Betting, river | 51% / 74% / 86% | 47% | 87% |
| Betting, turn | 28% / 45% / 63% | 53% | 74% |
| Betting, flop | 23% / 38% / 52% | 38% | 67% |

- **Facing a bet, a strength strip with one or two cut lines says more than the grid does with thirty cells.** This is the strongest support for the idea.
- **Betting on the river**: three bands (bluff, check, value) carry three quarters.
- **Betting on the flop and turn does not fall in bands by strength.** Sorting by other keys (beats now, equity plus draw) changes little. The strip alone would mislead here.

## 3. The second axis for flop and turn betting (`exp3.py`)

Hands placed on a two-axis map, the map cut into at most six regions; every pair of eight axes tried (900 decisions).

- One axis, four regions: 47% (flop), 54% (turn).
- Two axes, six regions: 66% (flop), 79% (turn). Nearly every pair that puts **strength** on one axis and **what the cards to come do to the hand** on the other (its draw, what good cards add, what bad cards cost) scores the same. Outs alone is the weakest second axis.
- All eight axes, twelve regions: 85% and 92%.

So a map of strength against how much the hand changes does with six regions what the grid does with thirty. No pair is special; "how settled is this hand" is the missing dimension, however it is measured.

## 4. Is there a small vocabulary of shapes? (`exp4.py`)

Each strip as ten steps, weakest to strongest, shaded by how often the step bets.

Betting (5,099 strips), five shapes cover 60% of how strips differ:

| Share | Shape, weakest to strongest (% betting) | A name |
|---|---|---|
| 27% | 34 33 31 27 21 20 22 38 66 74 | Top bets, the rest a third |
| 26% | 82 53 19 9 8 21 59 86 92 91 | Both ends (polarised) |
| 23% | 10 6 5 4 4 5 8 12 13 13 | Check everything |
| 14% | 29 33 38 37 41 66 82 86 88 82 | Top half (merged) |
| 11% | 74 72 66 62 71 77 80 86 92 91 | Bet everything |

Facing a bet (3,336 strips) there is one shape, a line: everything above it continues. Five positions of the line cover 67%.

## What this says about the ideas

- **Two strips**: supported for who has the top and for the direction of betting; supported strongly for defending (a line on a strip). Not enough for flop and turn betting, and silent on size.
- **Four-box card**: as good as the strips for a flexible reader, no better for a simple one; its fixed cut lines cost it when facing a bet.
- **New: the line.** Facing a bet the whole answer is where one line falls on your strip. That is one thing to picture.
- **New: five shapes.** A betting strip is nearly always one of five; a spot can be stored as a name.
- **New: the settled/unsettled map** for flop and turn betting: strength up the page, how much the hand changes across it.
- **Not found**: any picture that implies bet size.

## 5. A line on the strip: equity on the next card (`nextcard.mjs`, `exp5.py`)

The strip is sorted by equity now. A line beside it would show each hand's equity on the next card: its best card, its average, its median. 60 turn spots (93 betting and 44 defending decisions with mixing) and 14 flop spots (16 and 7; 3-bet and 4-bet pots only).

| | Turn betting | Turn facing a bet | Flop betting |
|---|---|---|---|
| Five strength bands alone | 64% | 87% | 56% |
| Mean line, distance from the strip: tracks what the bands miss | +0.01 (no) | +0.09 | -0.02 (no) |
| Max line: tracks what the bands miss | +0.04 | +0.14 | +0.05 |
| Median line: tracks what the bands miss | **-0.17**, same sign in 88% of decisions | **-0.30**, same sign in 95% | -0.09, same sign in 81% |
| Share of next cards that make the hand strong (70%+) | +0.11, same sign in 90% | +0.14, 89% | +0.10, 81% |
| Six regions on strength and the line (best line) | 76% (spread of next cards) | 96% | 66% |
| Six regions on strength alone | 66% | 87% | 58% |

- **Mean: no.** A hand's average equity over the next cards is its equity now, so the line lies on the strip and says nothing.
- **Max: barely.** Nearly every hand has some very good card.
- **Median: a little, and consistently.** Where the median dips below the strip (the hand is behind on most cards and far ahead on a few: a draw) the hand bets and continues more than its strength says. The link is weak (0.1 to 0.3) but points the same way in 81 to 95% of decisions.
- As a second axis any of these lifts six regions by 8 to 10 points, the same as the settled/unsettled map. They are one idea measured different ways.

## 6. Do different kinds of equity track value bets and bluffs differently? (`exp6.py`)

Betting decisions with mixing. The range is cut in three by equity now; inside each part, how each measure goes with how often the hand bets (correlation inside the decision, averaged; share of decisions with the same sign).

Turn (1,065 to 1,449 decisions for the showdown and draw measures; 62 to 94 for the next-card ones):

| Measure | Weak end (bluffs) | Middle | Strong end (value) |
|---|---|---|---|
| Draw: equity still to come | **+0.54** (94%) | +0.46 (85%) | -0.23 (74%) |
| What good cards add / bad cards cost | **+0.55** (93%) | +0.48 (86%) | -0.09 (62%) |
| Equity against his best third | +0.51 (91%) | +0.43 (85%) | **+0.34** (74%) |
| Showdown: beats now, no more cards | -0.26 (78%) | -0.34 (79%) | **+0.33** (76%) |
| Equity now | +0.13 (64%) | -0.13 (64%) | +0.29 (72%) |
| Spread of next cards | +0.38 (79%) | **+0.55** (90%) | -0.31 (83%) |
| Median next card | -0.26 (80%) | -0.38 (84%) | **+0.58** (96%) |
| Best next card (max) | +0.18 (71%) | +0.24 (79%) | +0.45 (93%) |

Flop (177 to 180 decisions): the same pattern, weaker. Draw +0.15 at the weak end, +0.28 in the middle, -0.16 at the strong end; showdown -0.12, -0.22, +0.22. The flop next-card sample (14 to 15 decisions) is too small to read.

- **Yes, they track differently, and the sign flips.** At the weak end and in the middle, the hands that bet are the ones that still change: draw and movement go with betting (+0.5 on the turn) and showdown strength goes against it. At the strong end it reverses: showdown strength and equity against his best hands go with betting, and draw goes against it.
- **Max is not the bluff measure.** It is the weakest of the movement measures at the weak end (+0.18); how much the hand moves, or its draw, does far more.
- **One measure works across the whole range: equity against his best third** (+0.51, +0.43, +0.34). It is high for draws among weak hands and for the nuts among strong ones.

## 7. Inside each bar of the strength ladder, which equity follows the betting? (`exp7.py`)

Flop and turn betting decisions with real mixing; inside each kind of hand, the correlation between how often a hand bets and each kind of equity (averaged over decisions; in brackets how often the sign agrees). Most bars are not all one action (58 to 93% of the time), so there is something for a line to explain.

| Bar | Turn: what follows the betting | Flop |
|---|---|---|
| Set or better | nothing (all under 0.05) | nothing consistent |
| Two pair | showdown +0.35 (75%), against his best +0.35; draw -0.22 | too few |
| Overpair | showdown +0.18 (64%) | against his best +0.26, showdown +0.25 |
| Top pair | against his best +0.43 (82%), showdown +0.40 (80%); draw -0.19 | against his best +0.50 (87%), showdown +0.40; draw -0.23 |
| Middle pair | draw +0.30 (78%), what cards to come change +0.32 | +0.23 to +0.27 |
| Low pair | draw +0.29 (73%), against his best +0.33 | weak (+0.13 to +0.15) |
| Draws | draw +0.48 (92%), what cards to come change +0.49 (91%) | against his best +0.20 (74%), equity +0.19 |
| Trash | draw +0.17 (67%); showdown -0.13 | draw +0.22 (77%); showdown -0.19 (72%) |

- **Yes, and the kind of equity changes down the ladder.** From top pair up, the hands that bet are the ones ahead now (showdown, or equity against his best hands), and having a draw goes against betting. From middle pair down, the hands that bet are the ones with more still to come, and showdown goes against betting among the trash.
- The switch is at the value line: above it, bet what is strongest now; below it, bet what can still change.
- Sets and better need no line: they bet or trap as a group.

## 8. What sorts the bars the equity lines leave unsorted? (`exp8.py`)

Inside a bar, the correlation between how often a hand bets and things a player can see in the hand (turn; share of decisions with the same sign):

| Bar | Best line | Others |
|---|---|---|
| Top pair | against his best hands +0.43 (82%) | ahead now +0.40; kicker +0.31 (77%) |
| Middle pair | still to come +0.30 (78%), outs +0.30 | he folds to this hand +0.26 (76%) |
| Low pair | **he folds to this hand +0.41 (85%)** | outs +0.33 |
| Draws | still to come +0.48 (92%), outs +0.45 | he folds to this hand +0.40; a gutshot alone -0.39 |
| Trash | **he folds to this hand +0.47 (89%)** | holds a card of the board's suit +0.18 (70%); high card -0.17 |

On the flop the same: trash follows "he folds to this hand" at +0.41 (90%) and holding a card of the board's suit at +0.35 (85%); low pair +0.31 (77%).

- The bottom bars are sorted by **blockers**: how much of his range folds once this hand's cards are taken out of it. Equity cannot sort them because they have almost none.
- So the ladder has three lines: ahead now (top pair and up), still to come (middle pair and draws), and how often he folds to this hand (low pair and trash).

## 9. What sets the bet size, and is it on the ladder? (`exp9.py`)

112 flop decisions with three sizes on offer (33%, 75%, 125% of the pot) on 72 flops. The bets are mostly small: 69% of betting uses the small size and 8% the big one; the mean size is half the pot.

- **What goes with a bigger bet:** deeper stacks (+0.41), and **not** having the range advantage (range gap -0.45, own equity -0.37, own top pair or better -0.36). A range that is ahead bets small with many hands; a range that is not bets bigger with fewer.
- **What does not:** the nut line (who has more two pair or better: -0.07; nut share at 90% equity: -0.18 on the gap). The saying that nut advantage sets the size is not borne out here.
- **None of it predicts the size on flops not seen.** A simple rule from the nut line, the range line, stack depth, his weak share, or all of them, is no closer than always saying the average (off by 0.15 to 0.18 pots against 0.17).
- From the value study: once the hands are right, using one size in place of two gives up 0.02% of the pot on the turn.

So the ladder shows which sizes are possible (slide the value line up: a bigger bet needs value above a higher line), not which one the solution takes; and which one it takes matters little.

## Experiment 10. Does the bet frequency take a few shapes inside one bar? (`exp10.py`)

4,213 bars of the strength ladder on 84 turn spots (betting decisions; a bar is a level holding 4% of the range or more). Each bar's hands sorted, cut in five equal parts, the bet frequency of each part named.

- **Three shapes cover three quarters of bars** when a bar is sorted by its own line (ahead now for top pair and up, still to come below): all bet or none bet 31%, rising towards the high end 36%, flat mix 7%. Falling 8%, both ends 8%, middle 10%.
- **Sorted by plain equity the shapes are muddier** (rising 25%, falling 16%): the level's own line is the better axis, most of all for other pair, draws and trash (rising 19 to 39%, 17 to 36%, 27 to 44%).
- **Polar inside a bar is rare** (8%). The polar shape of a betting range lies across the bars, not inside one.
- **The rise is a slope, not a step.** Mean frequency from the low end to the high end, mixed bars: top pair 28 to 60%, draws 46 to 85%, other pair 20 to 48%, trash 27 to 55%, two pair 35 to 64%. Sets and better are flat (54 to 53%). Only 43% of parts are all-or-nothing, and spreading a bar's frequency evenly along it rebuilds the five parts better (11 to 15 points out) than filling from the strong end (11 to 23).
- **The shape of one bar is hard to call beforehand**: 31% from the level alone, 42% with how often the range bets, 54% knowing how often the bar itself bets (the commonest shape: 25%).
- By level: draws are full in 42% of bars and bet 78% overall; other pair and trash are almost never full (1%) and empty in a quarter; top pair is the level most often rising (41%).

## Experiment 11. How often the range bets, and how often its value bets (`exp11.py`)

172 flop and 1,177 turn betting decisions (per hand), 9,114 river ones (by equity step, from the size study).

- **Value does not always bet, and position decides how often.** Hands at 80% equity or more bet: turn, in position 67 to 85%, out of position 31 to 50%; river, checked to 91%, first to act about 50%. His share of strong hands is the other driver (-0.49 turn, -0.61 river). Stack depth matters little (turn +0.26, lower only under 1.5 pots behind; river +0.06). Range advantage does not move it (-0.03, -0.08).
- **Range advantage sets how often the weak hands bet** (turn +0.43, river +0.74), and on the flop how often the whole range bets: 20% behind, 43% even, 76% ahead by 7 points or more.
- **No formula from value gets the frequency.** Points out, flop | turn: always the average 20 | 19; value (80%+) with its one-street bluffs 29 | 21; one bet per street left 27 | 29; counting what weaker hands win from behind as value 23 | 20; fitted on range advantage and position 16 | 17; with his strong and weak shares 16 | 15. River: the average 19, value and its bluffs 20, fitted 13.
- So frequency can be had to about 13 to 16 points from range advantage, position and his strong hands, and no closer from what the ladder shows.
