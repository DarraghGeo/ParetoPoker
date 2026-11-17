# The chart with heuristics and calculations (9667 solved decisions, 132 spots)

## 1. How often the range acts: how close each estimate comes

Typical miss in points of the range (mean), with the P90 in brackets. Learnt estimates are made on other spots (five folds by spot).

| first to act | decisions | bets on average | one figure for the situation | by who led | book share (calculated) | world reading | small tree: what is seen | small tree: seen + range and nut advantage | small tree: seen + book share and lead | strong learner: everything |
|---|---|---|---|---|---|---|---|---|---|---|
| flop, out of position | 132 | 37% | 28 (58) | 24 (48) | 27 (72) | 21 (40) | 19 (44) | 16 (34) | 18 (38) | 13 (27) |
| flop, in position | 132 | 46% | 13 (28) | 11 (27) | 20 (40) | 13 (26) | 10 (20) | 10 (22) | 10 (20) | 8 (18) |
| turn, out of position | 1020 | 31% | 20 (37) | 16 (32) | 24 (51) | 22 (45) | 15 (32) | 15 (33) | 15 (33) | 10 (24) |
| turn, in position | 1028 | 47% | 15 (32) | 14 (29) | 17 (35) | 19 (38) | 13 (27) | 13 (27) | 12 (25) | 8 (17) |
| river, out of position | 1691 | 32% | 23 (36) | 18 (37) | 20 (45) | - | 17 (36) | 15 (33) | 13 (30) | 9 (20) |
| river, in position | 1713 | 54% | 9 (21) | 9 (19) | 12 (32) | - | 8 (17) | 6 (13) | 6 (13) | 4 (9) |

Flop, the raiser's bet by the c-bet ramp (15% at 52% range equity to 100% at 58%): out of position 23 (51), in position 26 (44)

| facing a bet | decisions | continues on average | one figure | minimum defence | min. defence x min(1, 2 x range equity) | small tree: price, size, who led | strong learner: everything |
|---|---|---|---|---|---|---|---|
| flop, out of position | 224 | 57% | 12 (22) | 11 (24) | 8 (16) | 7 (15) | 7 (14) |
| flop, in position | 203 | 66% | 9 (16) | 6 (13) | 7 (14) | 5 (10) | 4 (10) |
| turn, out of position | 338 | 49% | 8 (14) | 9 (20) | 5 (10) | 5 (12) | 4 (11) |
| turn, in position | 276 | 62% | 7 (16) | 8 (17) | 12 (22) | 7 (15) | 5 (12) |
| river, out of position | 1653 | 46% | 14 (30) | 14 (37) | 9 (18) | 6 (14) | 3 (7) |
| river, in position | 1257 | 54% | 9 (23) | 8 (22) | 10 (20) | 6 (13) | 4 (9) |

## 2. A rulebook with nothing fitted

First to act: the range bets its book share (in position), or its lead over his (out of position; the whole range on the flop once the lead reaches the small bet's price). Value is a hand that beats 71% of his range; bluffs come from the hands under 20%, as many as the ratio allows; the rest check. Facing a bet: on the river continue with the price; before it continue with the top of the range down to minimum defence (in position) or minimum defence x min(1, 2 x range equity) (out of position), and never below the price. A hand within 3 points of a line is called a mix.

| situation | decisions | mixing | rows alone (learnt) | the rulebook | severe | error per decision: median | P90 | P95 |
|---|---|---|---|---|---|---|---|---|
| flop, out of position, first to act | 132 | 43% | 50% | 51% | 7% | 53 | 96 | 100 |
| flop, in position, first to act | 132 | 66% | 66% | 29% | 9% | 73 | 89 | 90 |
| turn, out of position, first to act | 1020 | 28% | 58% | 55% | 12% | 49 | 81 | 89 |
| turn, in position, first to act | 1028 | 39% | 51% | 44% | 16% | 55 | 72 | 78 |
| river, out of position, first to act | 1691 | 22% | 57% | 60% | 8% | 41 | 80 | 88 |
| river, in position, first to act | 1713 | 24% | 58% | 62% | 9% | 37 | 62 | 69 |
| flop, out of position, facing a bet | 224 | 16% | 71% | 73% | 8% | 27 | 39 | 44 |
| flop, in position, facing a bet | 203 | 15% | 70% | 75% | 7% | 23 | 39 | 46 |
| turn, out of position, facing a bet | 338 | 16% | 72% | 82% | 2% | 14 | 35 | 44 |
| turn, in position, facing a bet | 276 | 20% | 70% | 74% | 6% | 26 | 41 | 44 |
| river, out of position, facing a bet | 1653 | 27% | 62% | 80% | 0% | 19 | 41 | 48 |
| river, in position, facing a bet | 1257 | 26% | 67% | 81% | 0% | 17 | 38 | 45 |

## 3. The chart, then the heuristic that helps most, then the next

A strong learner, on spots it has not seen (three folds by spot). "Right" is the share of the range called right as Always / Mix / Never; "severe" is a hand that always acts called never, or the reverse.


### flop, out of position, first to act (132 decisions)

| what the learner is given | right | gain | severe |
|---|---|---|---|
| the spot's heuristics alone, nothing about the hand | 67% | | |
| the spot's heuristics and the hand's made class and draw, no chart | 69% | | |
| **the chart alone** (row, equity, place on the bar) | 50% | | 6% |
| + 1. top pair+ and two pair+ lead, off the butterfly (read) | 68% | +18.4 | |
| + 2. stack to pot (counted) | 73% | +4.7 | |
| the chart and those 2 | 73% | | 1% |
| the chart and every heuristic | 73% | | 1% |
| the rulebook, nothing fitted | 51% | | |

Error per decision, median / P90 / P95: chart alone 49 / 72 / 82; chart and those 2: 24 / 55 / 72; everything: 22 / 59 / 74.

### flop, in position, first to act (132 decisions)

| what the learner is given | right | gain | severe |
|---|---|---|---|
| the spot's heuristics alone, nothing about the hand | 66% | | |
| the spot's heuristics and the hand's made class and draw, no chart | 69% | | |
| **the chart alone** (row, equity, place on the bar) | 65% | | 2% |
| + 1. stack to pot (counted) | 70% | +4.4 | |
| + 2. pot type (seen) | 71% | +1.1 | |
| the chart and those 2 | 70% | | 1% |
| the chart and every heuristic | 71% | | 1% |
| the rulebook, nothing fitted | 29% | | |

Error per decision, median / P90 / P95: chart alone 33 / 53 / 58; chart and those 2: 28 / 47 / 55; everything: 26 / 48 / 54.

### turn, out of position, first to act (1020 decisions)

| what the learner is given | right | gain | severe |
|---|---|---|---|
| the spot's heuristics alone, nothing about the hand | 59% | | |
| the spot's heuristics and the hand's made class and draw, no chart | 66% | | |
| **the chart alone** (row, equity, place on the bar) | 59% | | 10% |
| + 1. the book share and the lead over his (calculated) | 63% | +3.9 | |
| + 2. the hand's draw (seen) | 65% | +2.0 | |
| + 3. stack to pot (counted) | 68% | +2.7 | |
| the chart and those 3 | 67% | | 4% |
| the chart and every heuristic | 69% | | 3% |
| the rulebook, nothing fitted | 55% | | |

Error per decision, median / P90 / P95: chart alone 40 / 70 / 82; chart and those 3: 33 / 59 / 68; everything: 31 / 56 / 65.

### turn, in position, first to act (1028 decisions)

| what the learner is given | right | gain | severe |
|---|---|---|---|
| the spot's heuristics alone, nothing about the hand | 45% | | |
| the spot's heuristics and the hand's made class and draw, no chart | 59% | | |
| **the chart alone** (row, equity, place on the bar) | 54% | | 8% |
| + 1. the hand's draw (seen) | 59% | +4.5 | |
| + 2. stack to pot (counted) | 62% | +3.5 | |
| + 3. the bet sizes on offer (seen) | 63% | +0.7 | |
| the chart and those 3 | 63% | | 4% |
| the chart and every heuristic | 64% | | 3% |
| the rulebook, nothing fitted | 44% | | |

Error per decision, median / P90 / P95: chart alone 45 / 67 / 75; chart and those 3: 36 / 57 / 65; everything: 34 / 58 / 68.

### river, out of position, first to act (1691 decisions)

| what the learner is given | right | gain | severe |
|---|---|---|---|
| the spot's heuristics alone, nothing about the hand | 62% | | |
| the spot's heuristics and the hand's made class and draw, no chart | 66% | | |
| **the chart alone** (row, equity, place on the bar) | 61% | | 13% |
| + 1. how polar each range is (read) | 67% | +5.9 | |
| + 2. weak hands of both (read) | 70% | +2.4 | |
| the chart and those 2 | 69% | | 6% |
| the chart and every heuristic | 71% | | 5% |
| the rulebook, nothing fitted | 60% | | |

Error per decision, median / P90 / P95: chart alone 38 / 71 / 82; chart and those 2: 30 / 63 / 74; everything: 29 / 60 / 72.

### river, in position, first to act (1713 decisions)

| what the learner is given | right | gain | severe |
|---|---|---|---|
| the spot's heuristics alone, nothing about the hand | 46% | | |
| the spot's heuristics and the hand's made class and draw, no chart | 65% | | |
| **the chart alone** (row, equity, place on the bar) | 70% | | 5% |
| + 1. the bet sizes on offer (seen) | 72% | +2.3 | |
| + 2. range equity advantage (read) | 74% | +1.7 | |
| the chart and those 2 | 74% | | 3% |
| the chart and every heuristic | 74% | | 3% |
| the rulebook, nothing fitted | 62% | | |

Error per decision, median / P90 / P95: chart alone 28 / 56 / 65; chart and those 2: 24 / 50 / 57; everything: 23 / 50 / 59.

### flop, out of position, facing a bet (224 decisions)

| what the learner is given | right | gain | severe |
|---|---|---|---|
| the spot's heuristics alone, nothing about the hand | 54% | | |
| the spot's heuristics and the hand's made class and draw, no chart | 75% | | |
| **the chart alone** (row, equity, place on the bar) | 73% | | 8% |
| + 1. stack to pot (counted) | 79% | +5.5 | |
| + 2. the hand's draw (seen) | 82% | +3.5 | |
| + 3. the price, and the hand's equity over it (calculated) | 84% | +1.9 | |
| the chart and those 3 | 84% | | 2% |
| the chart and every heuristic | 84% | | 2% |
| the rulebook, nothing fitted | 73% | | |

Error per decision, median / P90 / P95: chart alone 26 / 42 / 49; chart and those 3: 15 / 26 / 32; everything: 14 / 28 / 35.

### flop, in position, facing a bet (203 decisions)

| what the learner is given | right | gain | severe |
|---|---|---|---|
| the spot's heuristics alone, nothing about the hand | 59% | | |
| the spot's heuristics and the hand's made class and draw, no chart | 77% | | |
| **the chart alone** (row, equity, place on the bar) | 75% | | 7% |
| + 1. the hand's draw (seen) | 78% | +3.3 | |
| + 2. stack to pot (counted) | 82% | +4.1 | |
| the chart and those 2 | 81% | | 3% |
| the chart and every heuristic | 83% | | 2% |
| the rulebook, nothing fitted | 75% | | |

Error per decision, median / P90 / P95: chart alone 25 / 40 / 45; chart and those 2: 19 / 30 / 35; everything: 17 / 30 / 33.

### turn, out of position, facing a bet (338 decisions)

| what the learner is given | right | gain | severe |
|---|---|---|---|
| the spot's heuristics alone, nothing about the hand | 48% | | |
| the spot's heuristics and the hand's made class and draw, no chart | 77% | | |
| **the chart alone** (row, equity, place on the bar) | 83% | | 2% |
| + 1. the price, and the hand's equity over it (calculated) | 86% | +2.9 | |
| + 2. stack to pot (counted) | 87% | +0.8 | |
| the chart and those 2 | 87% | | 1% |
| the chart and every heuristic | 88% | | 1% |
| the rulebook, nothing fitted | 82% | | |

Error per decision, median / P90 / P95: chart alone 14 / 31 / 37; chart and those 2: 10 / 25 / 33; everything: 10 / 24 / 30.

### turn, in position, facing a bet (276 decisions)

| what the learner is given | right | gain | severe |
|---|---|---|---|
| the spot's heuristics alone, nothing about the hand | 53% | | |
| the spot's heuristics and the hand's made class and draw, no chart | 74% | | |
| **the chart alone** (row, equity, place on the bar) | 77% | | 3% |
| + 1. the hand's draw (seen) | 78% | +1.6 | |
| + 2. the price, and the hand's equity over it (calculated) | 79% | +1.0 | |
| + 3. defence by range equity, and whether the hand is inside it (calculated) | 80% | +1.0 | |
| the chart and those 3 | 80% | | 2% |
| the chart and every heuristic | 81% | | 2% |
| the rulebook, nothing fitted | 74% | | |

Error per decision, median / P90 / P95: chart alone 22 / 38 / 41; chart and those 3: 19 / 33 / 40; everything: 19 / 32 / 38.

### river, out of position, facing a bet (1653 decisions)

| what the learner is given | right | gain | severe |
|---|---|---|---|
| the spot's heuristics alone, nothing about the hand | 50% | | |
| the spot's heuristics and the hand's made class and draw, no chart | 70% | | |
| **the chart alone** (row, equity, place on the bar) | 83% | | 2% |
| + 1. the price, and the hand's equity over it (calculated) | 90% | +7.3 | |
| the chart and those 1 | 90% | | 0% |
| the chart and every heuristic | 91% | | 0% |
| the rulebook, nothing fitted | 80% | | |

Error per decision, median / P90 / P95: chart alone 12 / 43 / 54; chart and those 1: 6 / 27 / 35; everything: 5 / 24 / 34.

### river, in position, facing a bet (1257 decisions)

| what the learner is given | right | gain | severe |
|---|---|---|---|
| the spot's heuristics alone, nothing about the hand | 45% | | |
| the spot's heuristics and the hand's made class and draw, no chart | 73% | | |
| **the chart alone** (row, equity, place on the bar) | 85% | | 1% |
| + 1. the price, and the hand's equity over it (calculated) | 88% | +3.7 | |
| + 2. stack to pot (counted) | 89% | +0.5 | |
| the chart and those 2 | 89% | | 0% |
| the chart and every heuristic | 90% | | 0% |
| the rulebook, nothing fitted | 81% | | |

Error per decision, median / P90 / P95: chart alone 12 / 35 / 44; chart and those 2: 8 / 27 / 38; everything: 7 / 27 / 36.

(This last situation was run on its own after the main run was cut off by a time limit; the summary table was not written.)
