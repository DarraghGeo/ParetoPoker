# A second dimension for the one-dimension tables

On flops the table was not made from. "One answer" is each cell's least-losing answer; "free mixes" adds any answer within 0.5% of the pot a hand, in the solver's proportions. "Differs" is the share of play that is not the solver's; "frequency miss" the distance of the overall share of the second / third answer from the solver's, in points.


## river, out of position, facing a bet: margin alone, then with a second dimension (818 decisions)

| second dimension | kind | cells | one answer: EV lost | free mixes: EV lost | differs | frequency miss |
|---|---|---|---|---|---|---|
| **none** |  | 6 | 0.18 | 0.18 | 25 | 9 / 5 |
| row | hand | 48 | 0.16 | 0.17 | 24 | 9 / 6 |
| half | hand | 12 | 0.18 | 0.18 | 25 | 9 / 5 |
| pocket pair | hand | 12 | 0.18 | 0.18 | 25 | 9 / 5 |
| blockers | hand | 18 | 0.18 | 0.18 | 25 | 9 / 5 |
| his strong hands blocked | hand | 18 | 0.18 | 0.18 | 25 | 9 / 5 |
| flush card | hand | 24 | 0.18 | 0.18 | 25 | 9 / 5 |
| stack to pot | spot | 18 | 0.18 | 0.18 | 25 | 9 / 5 |
| top pair or better | spot | 18 | 0.18 | 0.18 | 25 | 9 / 5 |
| my range | spot | 18 | 0.18 | 0.18 | 25 | 9 / 5 |
| his weak hands | spot | 18 | 0.18 | 0.18 | 25 | 9 / 5 |
| range equity | spot | 18 | 0.18 | 0.18 | 25 | 9 / 5 |
| who bet last street | spot | 18 | 0.18 | 0.18 | 25 | 9 / 5 |
| what I face | spot | 18 | 0.18 | 0.18 | 25 | 9 / 5 |

least EV lost: margin x row. Cells (share of range | check-or-fold / second / third answer, in quarters | the solver):

- 5+ under the price / air: 15.6% | 100 / 0 / 0 | 99 / 0 / 1
- 5+ under the price / low pair: 3.7% | 100 / 0 / 0 | 99 / 0 / 1
- 5+ under the price / middle pair: 1.2% | 100 / 0 / 0 | 98 / 1 / 1
- 0-5 under / air: 6.1% | 100 / 0 / 0 | 83 / 15 / 2
- 0-5 under / low pair: 8.5% | 100 / 0 / 0 | 77 / 20 / 3
- 0-5 under / middle pair: 6.6% | 100 / 0 / 0 | 76 / 23 / 2
- 0-5 under / top pair: 6.0% | 100 / 0 / 0 | 69 / 30 / 2
- 0-5 under / two pair: 2.0% | 100 / 0 / 0 | 73 / 25 / 2
- 0-5 under / trips or better: 3.2% | 100 / 0 / 0 | 70 / 29 / 1
- 0-5 over / air: 3.1% | 0 / 100 / 0 | 43 / 50 / 6
- 0-5 over / low pair: 6.5% | 0 / 100 / 0 | 33 / 60 / 7
- 0-5 over / middle pair: 5.2% | 0 / 100 / 0 | 32 / 63 / 5
- 0-5 over / top pair: 6.4% | 0 / 100 / 0 | 32 / 64 / 4
- 0-5 over / overpair: 0.4% | 0 / 100 / 0 | 19 / 81 / 1
- 0-5 over / two pair: 2.1% | 0 / 100 / 0 | 27 / 68 / 4
- 0-5 over / trips or better: 3.4% | 0 / 100 / 0 | 29 / 69 / 2
- 5-15 over / middle pair: 0.4% | 0 / 100 / 0 | 1 / 89 / 11
- 5-15 over / top pair: 1.5% | 0 / 100 / 0 | 0 / 92 / 8
- 5-15 over / two pair: 0.5% | 0 / 100 / 0 | 0 / 93 / 7
- 5-15 over / trips or better: 1.1% | 0 / 100 / 0 | 0 / 98 / 2
- 15-30 over / top pair: 0.6% | 0 / 100 / 0 | 0 / 94 / 6
- 15-30 over / trips or better: 0.9% | 0 / 100 / 0 | 0 / 98 / 2
- 30+ over / top pair: 1.5% | 0 / 100 / 0 | 0 / 68 / 31
- 30+ over / two pair: 1.7% | 0 / 0 / 100 | 0 / 46 / 54
- 30+ over / trips or better: 9.3% | 0 / 0 / 100 | 0 / 41 / 59

closest to the solver: margin x row. Cells (share of range | check-or-fold / second / third answer, in quarters | the solver):

- 5+ under the price / air: 15.6% | 100 / 0 / 0 | 99 / 0 / 1
- 5+ under the price / low pair: 3.7% | 100 / 0 / 0 | 99 / 0 / 1
- 5+ under the price / middle pair: 1.2% | 100 / 0 / 0 | 98 / 1 / 1
- 0-5 under / air: 6.1% | 100 / 0 / 0 | 83 / 15 / 2
- 0-5 under / low pair: 8.5% | 100 / 0 / 0 | 77 / 20 / 3
- 0-5 under / middle pair: 6.6% | 100 / 0 / 0 | 76 / 23 / 2
- 0-5 under / top pair: 6.0% | 100 / 0 / 0 | 69 / 30 / 2
- 0-5 under / two pair: 2.0% | 100 / 0 / 0 | 73 / 25 / 2
- 0-5 under / trips or better: 3.2% | 100 / 0 / 0 | 70 / 29 / 1
- 0-5 over / air: 3.1% | 0 / 100 / 0 | 43 / 50 / 6
- 0-5 over / low pair: 6.5% | 0 / 100 / 0 | 33 / 60 / 7
- 0-5 over / middle pair: 5.2% | 0 / 100 / 0 | 32 / 63 / 5
- 0-5 over / top pair: 6.4% | 0 / 100 / 0 | 32 / 64 / 4
- 0-5 over / overpair: 0.4% | 0 / 100 / 0 | 19 / 81 / 1
- 0-5 over / two pair: 2.1% | 0 / 100 / 0 | 27 / 68 / 4
- 0-5 over / trips or better: 3.4% | 0 / 100 / 0 | 29 / 69 / 2
- 5-15 over / middle pair: 0.4% | 0 / 100 / 0 | 1 / 89 / 11
- 5-15 over / top pair: 1.5% | 0 / 100 / 0 | 0 / 92 / 8
- 5-15 over / two pair: 0.5% | 0 / 100 / 0 | 0 / 93 / 7
- 5-15 over / trips or better: 1.1% | 0 / 100 / 0 | 0 / 98 / 2
- 15-30 over / top pair: 0.6% | 0 / 100 / 0 | 0 / 94 / 6
- 15-30 over / trips or better: 0.9% | 0 / 100 / 0 | 0 / 98 / 2
- 30+ over / top pair: 1.5% | 0 / 100 / 0 | 0 / 68 / 31
- 30+ over / two pair: 1.7% | 0 / 0 / 100 | 0 / 46 / 54
- 30+ over / trips or better: 9.3% | 0 / 0 / 100 | 0 / 41 / 59

## river, in position, facing a bet: margin alone, then with a second dimension (620 decisions)

| second dimension | kind | cells | one answer: EV lost | free mixes: EV lost | differs | frequency miss |
|---|---|---|---|---|---|---|
| **none** |  | 6 | 0.33 | 0.33 | 27 | 10 / 7 |
| row | hand | 48 | 0.28 | 0.30 | 25 | 9 / 7 |
| half | hand | 12 | 0.33 | 0.33 | 27 | 10 / 7 |
| pocket pair | hand | 12 | 0.33 | 0.33 | 27 | 10 / 7 |
| blockers | hand | 18 | 0.33 | 0.33 | 27 | 10 / 7 |
| his strong hands blocked | hand | 18 | 0.33 | 0.33 | 27 | 10 / 7 |
| flush card | hand | 24 | 0.33 | 0.33 | 27 | 10 / 7 |
| stack to pot | spot | 18 | 0.33 | 0.33 | 27 | 10 / 7 |
| top pair or better | spot | 18 | 0.33 | 0.33 | 27 | 10 / 7 |
| my range | spot | 18 | 0.33 | 0.33 | 27 | 10 / 7 |
| who bet last street | spot | 18 | 0.33 | 0.33 | 27 | 10 / 7 |
| what I face | spot | 18 | 0.33 | 0.33 | 27 | 10 / 7 |
| his weak hands | spot | 18 | 0.33 | 0.33 | 27 | 10 / 7 |
| range equity | spot | 18 | 0.33 | 0.33 | 27 | 10 / 7 |

least EV lost: margin x row. Cells (share of range | check-or-fold / second / third answer, in quarters | the solver):

- 5+ under the price / air: 14.4% | 100 / 0 / 0 | 96 / 0 / 4
- 5+ under the price / low pair: 1.9% | 100 / 0 / 0 | 96 / 0 / 4
- 5+ under the price / middle pair: 0.6% | 100 / 0 / 0 | 97 / 1 / 2
- 0-5 under / air: 7.8% | 100 / 0 / 0 | 82 / 13 / 4
- 0-5 under / low pair: 6.9% | 100 / 0 / 0 | 75 / 20 / 5
- 0-5 under / middle pair: 6.3% | 100 / 0 / 0 | 73 / 24 / 3
- 0-5 under / top pair: 4.6% | 100 / 0 / 0 | 69 / 29 / 2
- 0-5 under / overpair: 1.1% | 100 / 0 / 0 | 68 / 28 / 4
- 0-5 under / two pair: 1.3% | 100 / 0 / 0 | 74 / 23 / 3
- 0-5 under / trips or better: 1.5% | 100 / 0 / 0 | 58 / 41 / 1
- 0-5 over / air: 4.1% | 0 / 100 / 0 | 46 / 46 / 7
- 0-5 over / low pair: 5.3% | 0 / 100 / 0 | 35 / 58 / 8
- 0-5 over / middle pair: 5.2% | 0 / 100 / 0 | 27 / 68 / 5
- 0-5 over / top pair: 6.1% | 0 / 100 / 0 | 26 / 71 / 3
- 0-5 over / overpair: 1.3% | 0 / 100 / 0 | 25 / 70 / 5
- 0-5 over / two pair: 1.7% | 0 / 100 / 0 | 22 / 72 / 5
- 0-5 over / trips or better: 2.7% | 0 / 100 / 0 | 21 / 77 / 2
- 5-15 over / middle pair: 0.8% | 0 / 100 / 0 | 1 / 95 / 4
- 5-15 over / top pair: 1.6% | 0 / 100 / 0 | 0 / 96 / 4
- 5-15 over / trips or better: 0.7% | 0 / 100 / 0 | 0 / 96 / 3
- 15-30 over / middle pair: 0.5% | 0 / 100 / 0 | 1 / 97 / 2
- 15-30 over / top pair: 1.1% | 0 / 100 / 0 | 0 / 97 / 3
- 15-30 over / trips or better: 1.1% | 0 / 100 / 0 | 0 / 97 / 3
- 30+ over / middle pair: 0.8% | 0 / 100 / 0 | 0 / 80 / 20
- 30+ over / top pair: 3.7% | 0 / 100 / 0 | 0 / 63 / 37
- 30+ over / overpair: 0.6% | 0 / 0 / 100 | 0 / 53 / 47
- 30+ over / two pair: 1.8% | 0 / 0 / 100 | 0 / 52 / 48
- 30+ over / trips or better: 12.4% | 0 / 0 / 100 | 0 / 35 / 65

closest to the solver: margin x row. Cells (share of range | check-or-fold / second / third answer, in quarters | the solver):

- 5+ under the price / air: 14.4% | 100 / 0 / 0 | 96 / 0 / 4
- 5+ under the price / low pair: 1.9% | 100 / 0 / 0 | 96 / 0 / 4
- 5+ under the price / middle pair: 0.6% | 100 / 0 / 0 | 97 / 1 / 2
- 0-5 under / air: 7.8% | 100 / 0 / 0 | 82 / 13 / 4
- 0-5 under / low pair: 6.9% | 100 / 0 / 0 | 75 / 20 / 5
- 0-5 under / middle pair: 6.3% | 100 / 0 / 0 | 73 / 24 / 3
- 0-5 under / top pair: 4.6% | 100 / 0 / 0 | 69 / 29 / 2
- 0-5 under / overpair: 1.1% | 100 / 0 / 0 | 68 / 28 / 4
- 0-5 under / two pair: 1.3% | 100 / 0 / 0 | 74 / 23 / 3
- 0-5 under / trips or better: 1.5% | 100 / 0 / 0 | 58 / 41 / 1
- 0-5 over / air: 4.1% | 0 / 100 / 0 | 46 / 46 / 7
- 0-5 over / low pair: 5.3% | 0 / 100 / 0 | 35 / 58 / 8
- 0-5 over / middle pair: 5.2% | 0 / 100 / 0 | 27 / 68 / 5
- 0-5 over / top pair: 6.1% | 0 / 100 / 0 | 26 / 71 / 3
- 0-5 over / overpair: 1.3% | 0 / 100 / 0 | 25 / 70 / 5
- 0-5 over / two pair: 1.7% | 0 / 100 / 0 | 22 / 72 / 5
- 0-5 over / trips or better: 2.7% | 0 / 100 / 0 | 21 / 77 / 2
- 5-15 over / middle pair: 0.8% | 0 / 100 / 0 | 1 / 95 / 4
- 5-15 over / top pair: 1.6% | 0 / 100 / 0 | 0 / 96 / 4
- 5-15 over / trips or better: 0.7% | 0 / 100 / 0 | 0 / 96 / 3
- 15-30 over / middle pair: 0.5% | 0 / 100 / 0 | 1 / 97 / 2
- 15-30 over / top pair: 1.1% | 0 / 100 / 0 | 0 / 97 / 3
- 15-30 over / trips or better: 1.1% | 0 / 100 / 0 | 0 / 97 / 3
- 30+ over / middle pair: 0.8% | 0 / 100 / 0 | 0 / 80 / 20
- 30+ over / top pair: 3.7% | 0 / 100 / 0 | 0 / 63 / 37
- 30+ over / overpair: 0.6% | 0 / 0 / 100 | 0 / 53 / 47
- 30+ over / two pair: 1.8% | 0 / 0 / 100 | 0 / 52 / 48
- 30+ over / trips or better: 12.4% | 0 / 0 / 100 | 0 / 35 / 65

## turn, out of position, first to act: equity alone, then with a second dimension (2372 decisions)

| second dimension | kind | cells | one answer: EV lost | free mixes: EV lost | differs | frequency miss |
|---|---|---|---|---|---|---|
| **none** |  | 6 | 0.16 | 0.20 | 26 | 24 / 0 |
| my range | spot | 18 | 0.15 | 0.16 | 25 | 21 / 0 |
| who bet last street | spot | 18 | 0.16 | 0.16 | 24 | 19 / 0 |
| his weak hands | spot | 18 | 0.16 | 0.17 | 26 | 23 / 0 |
| stack to pot | spot | 18 | 0.15 | 0.17 | 26 | 22 / 0 |
| his strong hands blocked | hand | 18 | 0.16 | 0.18 | 27 | 24 / 0 |
| blockers | hand | 18 | 0.16 | 0.18 | 27 | 24 / 0 |
| range equity | spot | 18 | 0.16 | 0.18 | 28 | 26 / 0 |
| row | hand | 48 | 0.16 | 0.18 | 27 | 24 / 0 |
| top pair or better | spot | 18 | 0.16 | 0.18 | 27 | 25 / 0 |
| pocket pair | hand | 12 | 0.16 | 0.18 | 27 | 25 / 0 |
| half | hand | 12 | 0.16 | 0.20 | 27 | 24 / 0 |
| flush card | hand | 24 | 0.16 | 0.20 | 26 | 23 / 0 |
| draw | hand | 24 | 0.16 | 0.21 | 26 | 23 / 0 |

least EV lost: equity x my range. Cells (share of range | check-or-fold / second / third answer, in quarters | the solver):

- under 20% / middling: 2.2% | 100 / 0 / 0 | 84 / 16 / 0
- under 20% / in between: 5.7% | 100 / 0 / 0 | 77 / 23 / 0
- under 20% / polar: 1.9% | 100 / 0 / 0 | 75 / 25 / 0
- 20-35% / middling: 7.9% | 100 / 0 / 0 | 76 / 23 / 0
- 20-35% / in between: 11.2% | 100 / 0 / 0 | 60 / 40 / 0
- 20-35% / polar: 2.3% | 100 / 0 / 0 | 56 / 44 / 0
- 35-50% / middling: 12.9% | 100 / 0 / 0 | 88 / 12 / 0
- 35-50% / in between: 7.3% | 100 / 0 / 0 | 70 / 30 / 0
- 35-50% / polar: 0.7% | 100 / 0 / 0 | 64 / 36 / 0
- 50-65% / middling: 11.6% | 100 / 0 / 0 | 90 / 10 / 0
- 50-65% / in between: 5.2% | 100 / 0 / 0 | 81 / 19 / 0
- 65-80% / middling: 8.2% | 100 / 0 / 0 | 74 / 25 / 1
- 65-80% / in between: 5.6% | 50 / 50 / 0 | 54 / 46 / 0
- 65-80% / polar: 0.5% | 50 / 50 / 0 | 49 / 51 / 0
- 80%+ / middling: 5.8% | 100 / 0 / 0 | 71 / 29 / 0
- 80%+ / in between: 8.5% | 50 / 50 / 0 | 38 / 62 / 0
- 80%+ / polar: 2.0% | 25 / 75 / 0 | 28 / 72 / 0

closest to the solver: equity x who bet last street. Cells (share of range | check-or-fold / second / third answer, in quarters | the solver):

- under 20% / nobody: 2.8% | 100 / 0 / 0 | 80 / 20 / 0
- under 20% / I did: 5.6% | 100 / 0 / 0 | 75 / 25 / 0
- under 20% / he did: 1.4% | 100 / 0 / 0 | 86 / 14 / 0
- 20-35% / nobody: 4.1% | 100 / 0 / 0 | 63 / 37 / 0
- 20-35% / I did: 11.1% | 100 / 0 / 0 | 57 / 42 / 0
- 20-35% / he did: 6.3% | 100 / 0 / 0 | 82 / 18 / 0
- 35-50% / nobody: 3.0% | 100 / 0 / 0 | 80 / 20 / 0
- 35-50% / I did: 6.8% | 100 / 0 / 0 | 66 / 34 / 1
- 35-50% / he did: 11.0% | 100 / 0 / 0 | 91 / 9 / 0
- 50-65% / nobody: 2.7% | 100 / 0 / 0 | 90 / 10 / 0
- 50-65% / I did: 4.9% | 100 / 0 / 0 | 75 / 24 / 1
- 50-65% / he did: 9.6% | 100 / 0 / 0 | 92 / 8 / 0
- 65-80% / nobody: 2.5% | 75 / 25 / 0 | 71 / 29 / 0
- 65-80% / I did: 5.9% | 50 / 50 / 0 | 45 / 53 / 2
- 65-80% / he did: 5.9% | 100 / 0 / 0 | 83 / 17 / 0
- 80%+ / nobody: 3.0% | 50 / 50 / 0 | 44 / 56 / 0
- 80%+ / I did: 7.6% | 25 / 75 / 0 | 35 / 64 / 0
- 80%+ / he did: 5.7% | 100 / 0 / 0 | 68 / 31 / 0

## turn, in position, first to act: equity alone, then with a second dimension (2323 decisions)

| second dimension | kind | cells | one answer: EV lost | free mixes: EV lost | differs | frequency miss |
|---|---|---|---|---|---|---|
| **none** |  | 6 | 0.22 | 0.26 | 34 | 18 / 0 |
| his weak hands | spot | 18 | 0.22 | 0.24 | 32 | 18 / 0 |
| range equity | spot | 18 | 0.22 | 0.25 | 31 | 15 / 0 |
| stack to pot | spot | 18 | 0.22 | 0.25 | 33 | 18 / 0 |
| my range | spot | 18 | 0.22 | 0.25 | 33 | 18 / 0 |
| who bet last street | spot | 18 | 0.22 | 0.25 | 32 | 19 / 0 |
| his strong hands blocked | hand | 18 | 0.22 | 0.25 | 33 | 17 / 0 |
| half | hand | 12 | 0.22 | 0.26 | 33 | 16 / 0 |
| top pair or better | spot | 18 | 0.22 | 0.26 | 31 | 15 / 0 |
| draw | hand | 24 | 0.22 | 0.27 | 31 | 14 / 0 |
| blockers | hand | 18 | 0.22 | 0.27 | 33 | 15 / 0 |
| flush card | hand | 24 | 0.22 | 0.28 | 32 | 15 / 0 |
| row | hand | 48 | 0.22 | 0.28 | 29 | 10 / 0 |
| pocket pair | hand | 12 | 0.22 | 0.30 | 32 | 12 / 0 |

least EV lost: equity x his weak hands. Cells (share of range | check-or-fold / second / third answer, in quarters | the solver):

- under 20% / under 20%: 9.4% | 100 / 0 / 0 | 63 / 37 / 0
- under 20% / 20-45%: 2.7% | 50 / 50 / 0 | 55 / 45 / 0
- under 20% / over 45%: 0.4% | 100 / 0 / 0 | 45 / 55 / 0
- 20-35% / under 20%: 9.6% | 100 / 0 / 0 | 61 / 39 / 0
- 20-35% / 20-45%: 8.4% | 100 / 0 / 0 | 62 / 38 / 0
- 20-35% / over 45%: 1.4% | 50 / 50 / 0 | 45 / 55 / 0
- 35-50% / under 20%: 4.5% | 100 / 0 / 0 | 72 / 28 / 0
- 35-50% / 20-45%: 8.8% | 100 / 0 / 0 | 73 / 27 / 0
- 35-50% / over 45%: 2.4% | 100 / 0 / 0 | 55 / 45 / 0
- 50-65% / under 20%: 4.1% | 100 / 0 / 0 | 83 / 17 / 0
- 50-65% / 20-45%: 6.1% | 100 / 0 / 0 | 85 / 15 / 0
- 50-65% / over 45%: 3.7% | 100 / 0 / 0 | 71 / 29 / 0
- 65-80% / under 20%: 7.4% | 50 / 50 / 0 | 47 / 53 / 0
- 65-80% / 20-45%: 7.8% | 100 / 0 / 0 | 63 / 37 / 0
- 65-80% / over 45%: 4.9% | 100 / 0 / 0 | 74 / 26 / 0
- 80%+ / under 20%: 6.8% | 0 / 100 / 0 | 22 / 78 / 0
- 80%+ / 20-45%: 7.5% | 0 / 100 / 0 | 38 / 62 / 0
- 80%+ / over 45%: 4.1% | 0 / 100 / 0 | 44 / 56 / 0

closest to the solver: equity x row. Cells (share of range | check-or-fold / second / third answer, in quarters | the solver):

- under 20% / air: 9.3% | 50 / 50 / 0 | 59 / 41 / 0
- under 20% / draw: 0.6% | 100 / 0 / 0 | 66 / 34 / 0
- under 20% / low pair: 2.2% | 100 / 0 / 0 | 62 / 38 / 0
- 20-35% / air: 9.3% | 50 / 50 / 0 | 62 / 38 / 0
- 20-35% / draw: 6.0% | 50 / 50 / 0 | 47 / 53 / 0
- 20-35% / low pair: 2.6% | 100 / 0 / 0 | 71 / 29 / 0
- 20-35% / middle pair: 0.9% | 100 / 0 / 0 | 82 / 18 / 0
- 35-50% / air: 4.5% | 100 / 0 / 0 | 76 / 24 / 0
- 35-50% / draw: 4.3% | 50 / 50 / 0 | 44 / 56 / 0
- 35-50% / low pair: 3.4% | 100 / 0 / 0 | 80 / 20 / 0
- 35-50% / middle pair: 2.2% | 100 / 0 / 0 | 83 / 17 / 0
- 35-50% / top pair: 0.9% | 100 / 0 / 0 | 90 / 10 / 0
- 50-65% / air: 1.5% | 100 / 0 / 0 | 83 / 17 / 0
- 50-65% / draw: 1.1% | 100 / 0 / 0 | 62 / 38 / 0
- 50-65% / low pair: 3.1% | 100 / 0 / 0 | 85 / 15 / 0
- 50-65% / middle pair: 4.1% | 100 / 0 / 0 | 83 / 17 / 0
- 50-65% / top pair: 2.4% | 100 / 0 / 0 | 82 / 18 / 0
- 50-65% / overpair: 0.8% | 100 / 0 / 0 | 65 / 35 / 0
- 50-65% / two pair: 0.5% | 100 / 0 / 0 | 81 / 19 / 0
- 65-80% / low pair: 1.0% | 100 / 0 / 0 | 78 / 22 / 0
- 65-80% / middle pair: 4.9% | 100 / 0 / 0 | 73 / 27 / 0
- 65-80% / top pair: 8.5% | 50 / 50 / 0 | 56 / 44 / 0
- 65-80% / overpair: 2.5% | 50 / 50 / 0 | 48 / 52 / 0
- 65-80% / two pair: 1.2% | 50 / 50 / 0 | 50 / 50 / 0
- 65-80% / trips or better: 1.7% | 50 / 50 / 0 | 52 / 48 / 0
- 80%+ / middle pair: 0.5% | 50 / 50 / 0 | 61 / 39 / 0
- 80%+ / top pair: 5.0% | 50 / 50 / 0 | 41 / 59 / 0
- 80%+ / overpair: 1.4% | 25 / 75 / 0 | 37 / 63 / 0
- 80%+ / two pair: 1.8% | 0 / 100 / 0 | 23 / 77 / 0
- 80%+ / trips or better: 9.6% | 0 / 100 / 0 | 29 / 71 / 0

## flop, in position, first to act: equity alone, then with a second dimension (221 decisions)

| second dimension | kind | cells | one answer: EV lost | free mixes: EV lost | differs | frequency miss |
|---|---|---|---|---|---|---|
| **none** |  | 6 | 0.06 | 0.09 | 24 | 11 / 0 |
| row | hand | 48 | 0.06 | 0.08 | 23 | 11 / 0 |
| pocket pair | hand | 12 | 0.06 | 0.08 | 24 | 10 / 0 |
| half | hand | 12 | 0.06 | 0.08 | 24 | 10 / 0 |
| stack to pot | spot | 18 | 0.06 | 0.08 | 24 | 10 / 0 |
| who bet last street | spot | 18 | 0.06 | 0.08 | 24 | 10 / 0 |
| my range | spot | 18 | 0.06 | 0.08 | 24 | 10 / 0 |
| range equity | spot | 18 | 0.06 | 0.09 | 23 | 10 / 0 |
| his weak hands | spot | 18 | 0.06 | 0.09 | 24 | 11 / 0 |
| his strong hands blocked | hand | 18 | 0.06 | 0.09 | 24 | 11 / 0 |
| blockers | hand | 18 | 0.06 | 0.09 | 24 | 11 / 0 |
| draw | hand | 24 | 0.06 | 0.09 | 23 | 11 / 0 |
| top pair or better | spot | 18 | 0.06 | 0.09 | 24 | 10 / 0 |
| flush card | hand | 24 | 0.06 | 0.09 | 24 | 10 / 0 |

least EV lost: equity x row. Cells (share of range | check-or-fold / second / third answer, in quarters | the solver):

- under 20% / air: 1.2% | 50 / 50 / 0 | 54 / 46 / 0
- under 20% / low pair: 1.0% | 75 / 25 / 0 | 67 / 33 / 0
- 20-35% / air: 16.2% | 50 / 50 / 0 | 46 / 54 / 0
- 20-35% / low pair: 1.1% | 75 / 25 / 0 | 70 / 30 / 0
- 35-50% / air: 21.8% | 50 / 50 / 0 | 50 / 50 / 0
- 35-50% / draw: 1.9% | 50 / 50 / 0 | 41 / 59 / 0
- 35-50% / low pair: 3.7% | 50 / 50 / 0 | 62 / 38 / 0
- 35-50% / middle pair: 0.7% | 75 / 25 / 0 | 71 / 29 / 0
- 50-65% / air: 6.0% | 50 / 50 / 0 | 54 / 46 / 0
- 50-65% / draw: 3.9% | 25 / 75 / 0 | 34 / 66 / 0
- 50-65% / low pair: 4.2% | 50 / 50 / 0 | 61 / 39 / 0
- 50-65% / middle pair: 5.3% | 50 / 50 / 0 | 58 / 42 / 0
- 50-65% / top pair: 0.5% | 75 / 25 / 0 | 65 / 35 / 0
- 50-65% / overpair: 0.4% | 50 / 50 / 0 | 42 / 58 / 0
- 65-80% / draw: 0.6% | 25 / 75 / 0 | 37 / 63 / 0
- 65-80% / middle pair: 5.9% | 50 / 50 / 0 | 44 / 56 / 0
- 65-80% / top pair: 10.6% | 50 / 50 / 0 | 44 / 56 / 0
- 65-80% / overpair: 2.6% | 25 / 75 / 0 | 32 / 68 / 0
- 80%+ / top pair: 4.3% | 25 / 75 / 0 | 26 / 74 / 0
- 80%+ / overpair: 1.6% | 25 / 75 / 0 | 30 / 70 / 0
- 80%+ / two pair: 1.3% | 0 / 100 / 0 | 13 / 87 / 0
- 80%+ / trips or better: 4.3% | 0 / 100 / 0 | 18 / 82 / 0

closest to the solver: equity x range equity. Cells (share of range | check-or-fold / second / third answer, in quarters | the solver):

- under 20% / under 45%: 1.1% | 75 / 25 / 0 | 69 / 31 / 0
- under 20% / 45-55%: 0.9% | 50 / 50 / 0 | 53 / 47 / 0
- 20-35% / under 45%: 0.8% | 75 / 25 / 0 | 71 / 29 / 0
- 20-35% / 45-55%: 12.5% | 50 / 50 / 0 | 51 / 49 / 0
- 20-35% / over 55%: 4.1% | 25 / 75 / 0 | 32 / 68 / 0
- 35-50% / 45-55%: 19.8% | 50 / 50 / 0 | 59 / 41 / 0
- 35-50% / over 55%: 8.0% | 25 / 75 / 0 | 33 / 67 / 0
- 50-65% / 45-55%: 14.7% | 50 / 50 / 0 | 57 / 43 / 0
- 50-65% / over 55%: 5.4% | 50 / 50 / 0 | 39 / 61 / 0
- 65-80% / under 45%: 0.9% | 50 / 50 / 0 | 42 / 58 / 0
- 65-80% / 45-55%: 12.0% | 50 / 50 / 0 | 46 / 54 / 0
- 65-80% / over 55%: 7.6% | 25 / 75 / 0 | 35 / 65 / 0
- 80%+ / 45-55%: 6.2% | 25 / 75 / 0 | 29 / 71 / 0
- 80%+ / over 55%: 5.1% | 25 / 75 / 0 | 14 / 86 / 0

## flop, out of position, first to act: row alone, then with a second dimension (226 decisions)

| second dimension | kind | cells | one answer: EV lost | free mixes: EV lost | differs | frequency miss |
|---|---|---|---|---|---|---|
| **none** |  | 8 | 0.05 | 0.07 | 20 | 18 / 0 |
| stack to pot | spot | 24 | 0.03 | 0.05 | 11 | 9 / 0 |
| who bet last street | spot | 24 | 0.03 | 0.05 | 11 | 9 / 0 |
| top pair or better | spot | 24 | 0.03 | 0.05 | 11 | 9 / 0 |
| his weak hands | spot | 24 | 0.04 | 0.06 | 17 | 15 / 0 |
| pocket pair | hand | 16 | 0.05 | 0.06 | 19 | 17 / 0 |
| blockers | hand | 24 | 0.04 | 0.07 | 20 | 17 / 0 |
| flush card | hand | 32 | 0.05 | 0.07 | 20 | 18 / 0 |
| half | hand | 16 | 0.04 | 0.07 | 20 | 18 / 0 |
| draw | hand | 32 | 0.05 | 0.07 | 20 | 18 / 0 |
| range equity | spot | 24 | 0.03 | 0.08 | 19 | 16 / 0 |
| his strong hands blocked | hand | 24 | 0.04 | 0.08 | 20 | 17 / 0 |
| equity | hand | 48 | 0.04 | 0.08 | 21 | 18 / 0 |
| my range | spot | 24 | 0.05 | 0.09 | 21 | 19 / 0 |

least EV lost: row x stack to pot. Cells (share of range | check-or-fold / second / third answer, in quarters | the solver):

- air / 2 to 6: 11.5% | 50 / 50 / 0 | 47 / 53 / 0
- air / over 6: 33.9% | 100 / 0 / 0 | 95 / 5 / 0
- draw / 2 to 6: 1.0% | 25 / 75 / 0 | 30 / 70 / 0
- draw / over 6: 6.4% | 100 / 0 / 0 | 90 / 10 / 0
- low pair / 2 to 6: 1.7% | 50 / 50 / 0 | 51 / 49 / 0
- low pair / over 6: 11.5% | 100 / 0 / 0 | 97 / 3 / 0
- middle pair / 2 to 6: 3.0% | 50 / 50 / 0 | 47 / 53 / 0
- middle pair / over 6: 8.8% | 100 / 0 / 0 | 96 / 4 / 0
- top pair / 2 to 6: 4.0% | 25 / 75 / 0 | 31 / 69 / 0
- top pair / over 6: 9.2% | 100 / 0 / 0 | 96 / 4 / 0
- overpair / 2 to 6: 2.5% | 25 / 75 / 0 | 28 / 72 / 0
- overpair / over 6: 0.7% | 75 / 25 / 0 | 67 / 33 / 0
- two pair / 2 to 6: 0.4% | 0 / 100 / 0 | 10 / 90 / 0
- two pair / over 6: 1.3% | 100 / 0 / 0 | 94 / 6 / 0
- trips or better / 2 to 6: 1.1% | 50 / 50 / 0 | 45 / 55 / 0
- trips or better / over 6: 3.2% | 75 / 25 / 0 | 87 / 13 / 0

closest to the solver: row x top pair or better. Cells (share of range | check-or-fold / second / third answer, in quarters | the solver):

- air / he has more: 25.3% | 100 / 0 / 0 | 98 / 2 / 0
- air / about even: 12.1% | 75 / 25 / 0 | 84 / 16 / 0
- air / I have more: 8.0% | 25 / 75 / 0 | 35 / 65 / 0
- draw / he has more: 4.7% | 100 / 0 / 0 | 95 / 5 / 0
- draw / about even: 1.8% | 75 / 25 / 0 | 75 / 25 / 0
- draw / I have more: 0.8% | 25 / 75 / 0 | 24 / 76 / 0
- low pair / he has more: 9.7% | 100 / 0 / 0 | 99 / 1 / 0
- low pair / about even: 2.0% | 75 / 25 / 0 | 86 / 14 / 0
- low pair / I have more: 1.5% | 50 / 50 / 0 | 47 / 53 / 0
- middle pair / he has more: 7.1% | 100 / 0 / 0 | 99 / 1 / 0
- middle pair / about even: 2.2% | 75 / 25 / 0 | 86 / 14 / 0
- middle pair / I have more: 2.5% | 50 / 50 / 0 | 40 / 60 / 0
- top pair / he has more: 7.2% | 100 / 0 / 0 | 98 / 2 / 0
- top pair / about even: 2.6% | 75 / 25 / 0 | 82 / 18 / 0
- top pair / I have more: 3.4% | 25 / 75 / 0 | 25 / 75 / 0
- overpair / about even: 1.3% | 50 / 50 / 0 | 52 / 48 / 0
- overpair / I have more: 1.6% | 25 / 75 / 0 | 17 / 83 / 0
- two pair / he has more: 1.0% | 100 / 0 / 0 | 97 / 3 / 0
- two pair / I have more: 0.4% | 0 / 100 / 0 | 9 / 91 / 0
- trips or better / he has more: 2.1% | 100 / 0 / 0 | 94 / 6 / 0
- trips or better / about even: 1.2% | 75 / 25 / 0 | 74 / 26 / 0
- trips or better / I have more: 0.9% | 50 / 50 / 0 | 39 / 61 / 0
