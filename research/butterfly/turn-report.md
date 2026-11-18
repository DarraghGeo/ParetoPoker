# The turn tests together

Exploitability on the 16 turn spots not solved on, percent of the pot as the turn starts. Turn and river solved together, one bet size and one raise a street.

| tables | OOP: mean | median | worst | IP: mean | median | worst | both seats |
|---|---|---|---|---|---|---|---|
| draw | 12.6 | 11.4 | 21.7 | 14.5 | 13.9 | 22.7 | 13.5 |
| ranges as the turn starts | 11.6 | 10.8 | 18.8 | 14.1 | 12.5 | 22.0 | 12.9 |
| ranges as the turn starts + stack depth | 12.2 | 9.9 | 36.0 | 11.0 | 10.4 | 20.1 | 11.6 |
| the range held + stack depth + draw (three kinds, turn tables) | 11.3 | 10.8 | 19.7 | 9.8 | 9.6 | 13.6 | 10.6 |
| true+spr+nut+fdraw | 10.8 | 9.7 | 20.1 | 9.6 | 9.1 | 15.1 | 10.2 |
| true+spr+nut | 10.5 | 9.3 | 18.8 | 9.3 | 8.7 | 13.8 | 9.9 |
| the range held + stack depth | 10.5 | 9.5 | 17.6 | 8.5 | 8.3 | 11.3 | 9.5 |
| the range held | 10.1 | 9.0 | 19.0 | 8.9 | 8.7 | 14.2 | 9.5 |
| the range held + stack depth, twenty bands of five points | 10.4 | 9.1 | 18.8 | 8.6 | 8.6 | 12.3 | 9.5 |

## Inside our cells: how the unrestricted solve plays the kinds of hand a cell holds (30 turn spots)

How much of the play inside a cell differs from hand to hand, and how much of that difference each further split would explain (share of the variance of the first answer: check or fold):

| table | spread inside the cells (std, points) | explained by: the draw kind | the made hand | the board (each spot its own table) |
|---|---|---|---|---|
| T first | 25 | 29% | 26% | 60% |
| T facing a bet | 21 | 55% | 22% | 28% |
| T facing a raise | 24 | 33% | 14% | 49% |
| R first | 19 | - | 25% | 56% |
| R facing a bet | 10 | - | 15% | 55% |
| R facing a raise | 15 | - | 19% | 50% |

**T first: share that bets, by the hand's place in the range and its draw** (all spots, both seats)

| place | no draw | gutshot | flush draw or 8+ cards |
|---|---|---|---|
| top 10% | 67% (8) | 67% (1) | 67% (1) |
| 75-90% | 58% (12) | 59% (2) | 41% (2) |
| 55-75% | 23% (13) | 29% (2) | 31% (5) |
| 35-55% | 9% (11) | 15% (4) | 36% (6) |
| 15-35% | 23% (10) | 36% (5) | 45% (5) |
| bottom 15% | 35% (6) | 47% (6) | 45% (3) |

**T facing a bet: share that folds, by the hand's place in the range and its draw** (all spots, both seats)

| place | no draw | gutshot | flush draw or 8+ cards |
|---|---|---|---|
| top 10% | 0% (8) | 0% (1) | 0% (1) |
| 75-90% | 1% (11) | 0% (2) | 0% (2) |
| 55-75% | 30% (13) | 17% (2) | 6% (5) |
| 35-55% | 72% (11) | 68% (4) | 33% (5) |
| 15-35% | 92% (10) | 88% (5) | 52% (4) |
| bottom 15% | 98% (7) | 95% (6) | 54% (2) |

**T first: share that bets, by place and made hand**

| place | high card | pair | two pair | trips | straight | flush | full house+ |
|---|---|---|---|---|---|---|---|
| top 10% | - | 48% (5) | 83% (12) | 65% (41) | 78% (16) | 51% (3) | 60% (22) |
| 75-90% | 0% (1) | 50% (35) | 56% (26) | 65% (28) | 68% (3) | 38% (2) | 63% (5) |
| 55-75% | 32% (5) | 24% (60) | 28% (29) | 30% (4) | - | 16% (1) | 33% (1) |
| 35-55% | 33% (21) | 16% (63) | 7% (15) | 0% (0) | - | 25% (1) | - |
| 15-35% | 39% (39) | 28% (53) | 24% (9) | - | - | - | - |
| bottom 15% | 43% (52) | 41% (46) | 18% (2) | - | - | - | - |

**R first: share that bets, by place and made hand**

| place | high card | pair | two pair | trips | straight | flush | full house+ |
|---|---|---|---|---|---|---|---|
| top 10% | - | 79% (3) | 81% (9) | 69% (18) | 83% (18) | 80% (16) | 75% (36) |
| 75-90% | - | 67% (13) | 71% (24) | 75% (20) | 81% (13) | 81% (10) | 78% (19) |
| 55-75% | 8% (0) | 28% (28) | 39% (35) | 59% (17) | 67% (8) | 60% (5) | 71% (7) |
| 35-55% | 7% (4) | 13% (43) | 16% (37) | 40% (9) | 49% (2) | 27% (2) | 36% (2) |
| 15-35% | 22% (14) | 18% (52) | 16% (28) | 27% (4) | 42% (1) | 12% (1) | 19% (1) |
| bottom 15% | 51% (33) | 48% (50) | 40% (14) | 39% (2) | 36% (0) | 16% (0) | - |

**R facing a bet: share that folds, by place and made hand**

| place | high card | pair | two pair | trips | straight | flush | full house+ |
|---|---|---|---|---|---|---|---|
| top 10% | - | 1% (5) | 1% (13) | 1% (18) | 0% (15) | 0% (16) | 0% (33) |
| 75-90% | - | 8% (23) | 7% (31) | 5% (14) | 3% (9) | 4% (10) | 4% (13) |
| 55-75% | 63% (1) | 36% (37) | 34% (37) | 23% (11) | 25% (5) | 29% (5) | 27% (4) |
| 35-55% | 76% (6) | 64% (47) | 60% (37) | 54% (6) | 57% (1) | 55% (2) | 47% (1) |
| 15-35% | 89% (14) | 84% (53) | 77% (28) | 76% (3) | 65% (0) | 68% (1) | 62% (1) |
| bottom 15% | 96% (31) | 93% (51) | 89% (16) | 84% (2) | 66% (0) | - | - |

In brackets: the share of that table (or of that place) the group makes up.
