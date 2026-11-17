# Three-answer rules from the stored solves with raises (13146 decisions, 227 flops)

EV lost in percent of the pot per decision, on flops the table was not made from. Flop and turn: the full hands (bets 33/75% flop, 75% turn, all-in, one 3x raise). River: bets 33/75/150%, all-in, two 3x raises.


## river, out of position, facing a bet (818 decisions; the solver: call 36%, raise 10%)

| table | cells | EV lost: mean | median | P90 | P95 | over 1% pot |
|---|---|---|---|---|---|---|
| **kept**: margin | 6 | 0.18 | 0.08 | 0.49 | 0.69 | 2% |
| best of any size: row x margin | 48 | 0.16 | 0.07 | 0.44 | 0.69 | 2% |
| the kept table without "raise" | 6 | 1.41 | 1.01 | 3.36 | 4.03 | 50% |
| always fold | 0 | 13.18 | 12.94 | 21.80 | 24.02 | 98% |
| always call | 0 | 8.00 | 6.54 | 16.34 | 20.92 | 97% |
| always raise | 0 | 6.05 | 3.83 | 12.32 | 18.04 | 96% |

| margin | share | answer | next best | gap (% pot a hand) | solver: fold / call / raise |
|---|---|---|---|---|---|
| 5+ under the price | 21.4% | fold | raise | 16.9 | 99 / 0 / 1 |
| 0-5 under | 32.7% | fold | call | 1.8 | 75 / 23 / 2 |
| 0-5 over | 27.0% | call | fold | 1.4 | 33 / 62 / 5 |
| 5-15 over | 3.9% | call | raise | 3.3 | 0 / 93 / 7 |
| 15-30 over | 2.0% | call | raise | 5.0 | 0 / 96 / 4 |
| 30+ over | 12.9% | raise | call | 9.6 | 0 / 45 / 55 |

## river, in position, facing a bet (620 decisions; the solver: call 39%, raise 14%)

| table | cells | EV lost: mean | median | P90 | P95 | over 1% pot |
|---|---|---|---|---|---|---|
| **kept**: margin | 6 | 0.33 | 0.16 | 0.85 | 1.20 | 7% |
| best of any size: row x margin x top pair or better x his weak hands | 432 | 0.26 | 0.12 | 0.70 | 0.97 | 5% |
| the kept table without "raise" | 6 | 1.91 | 1.55 | 4.36 | 5.38 | 65% |
| always fold | 0 | 19.28 | 18.03 | 32.38 | 35.32 | 100% |
| always call | 0 | 7.13 | 6.17 | 12.21 | 15.46 | 98% |
| always raise | 0 | 5.10 | 3.38 | 10.29 | 14.97 | 95% |

| margin | share | answer | next best | gap (% pot a hand) | solver: fold / call / raise |
|---|---|---|---|---|---|
| 5+ under the price | 17.7% | fold | raise | 13.9 | 96 / 0 / 3 |
| 0-5 under | 29.4% | fold | call | 1.7 | 75 / 22 / 4 |
| 0-5 over | 26.4% | call | fold | 1.5 | 30 / 64 / 5 |
| 5-15 over | 3.9% | call | raise | 5.8 | 1 / 95 / 4 |
| 15-30 over | 3.1% | call | raise | 7.2 | 0 / 97 / 3 |
| 30+ over | 19.5% | raise | call | 8.1 | 0 / 45 / 55 |

## turn, out of position, facing a bet (2716 decisions; the solver: call 45%, raise 7%)

| table | cells | EV lost: mean | median | P90 | P95 | over 1% pot |
|---|---|---|---|---|---|---|
| **kept**: margin x draw | 24 | 0.37 | 0.24 | 0.78 | 1.09 | 6% |
| best of any size: row x margin x draw x stack to pot x top pair or better | 1728 | 0.25 | 0.17 | 0.55 | 0.75 | 2% |
| the kept table without "raise" | 24 | 0.37 | 0.24 | 0.79 | 1.06 | 6% |
| always fold | 0 | 16.73 | 15.72 | 22.64 | 25.61 | 100% |
| always call | 0 | 3.69 | 3.11 | 7.00 | 8.54 | 93% |
| always raise | 0 | 5.19 | 4.62 | 9.37 | 10.98 | 95% |

| margin | draw | share | answer | next best | gap (% pot a hand) | solver: fold / call / raise |
|---|---|---|---|---|---|---|
| 5+ under the price | no draw | 6.6% | fold | raise | 17.9 | 100 / 0 / 0 |
| 5+ under the price | gutshot | 5.7% | fold | raise | 11.6 | 99 / 0 / 0 |
| 5+ under the price | open-ended | 3.0% | fold | raise | 4.8 | 81 / 10 / 8 |
| 5+ under the price | flush draw | 1.7% | fold | raise | 6.0 | 94 / 4 / 2 |
| 0-5 under | no draw | 2.6% | fold | call | 10.4 | 97 / 3 / 0 |
| 0-5 under | gutshot | 1.8% | fold | call | 7.3 | 97 / 2 / 0 |
| 0-5 under | open-ended | 1.1% | fold | call | 2.3 | 76 / 18 / 6 |
| 0-5 under | flush draw | 2.1% | fold | raise | 0.4 | 61 / 25 / 14 |
| 0-5 over | no draw | 5.0% | fold | call | 5.1 | 85 / 15 / 0 |
| 0-5 over | gutshot | 1.9% | fold | call | 4.4 | 86 / 13 / 1 |
| 0-5 over | open-ended | 0.7% | fold | call | 2.4 | 75 / 22 / 3 |
| 0-5 over | flush draw | 2.1% | raise | call | 0.1 | 35 / 48 / 16 |
| 5-15 over | no draw | 18.7% | fold | call | 1.1 | 70 / 30 / 1 |
| 5-15 over | gutshot | 5.2% | fold | call | 0.6 | 62 / 36 / 2 |
| 5-15 over | open-ended | 1.2% | call | fold | 1.2 | 44 / 51 / 5 |
| 5-15 over | flush draw | 3.3% | call | raise | 0.7 | 15 / 72 / 13 |
| 15-30 over | no draw | 11.4% | call | raise | 2.3 | 11 / 86 / 3 |
| 15-30 over | gutshot | 3.2% | call | raise | 1.7 | 7 / 86 / 7 |
| 15-30 over | open-ended | 1.2% | call | raise | 0.9 | 3 / 86 / 11 |
| 15-30 over | flush draw | 4.9% | call | raise | 1.1 | 0 / 86 / 13 |
| 30+ over | no draw | 12.0% | call | raise | 0.4 | 0 / 79 / 21 |
| 30+ over | gutshot | 2.6% | raise | call | 0.1 | 0 / 77 / 23 |
| 30+ over | flush draw | 1.6% | call | raise | 0.1 | 0 / 79 / 21 |

## turn, in position, facing a bet (2492 decisions; the solver: call 56%, raise 4%)

| table | cells | EV lost: mean | median | P90 | P95 | over 1% pot |
|---|---|---|---|---|---|---|
| **kept**: margin x draw | 24 | 0.42 | 0.28 | 0.96 | 1.27 | 9% |
| best of any size: row x margin x draw x stack to pot x who bet last street | 1728 | 0.23 | 0.16 | 0.51 | 0.70 | 2% |
| the kept table without "raise" | 24 | 0.42 | 0.28 | 0.96 | 1.27 | 9% |
| always fold | 0 | 19.19 | 18.47 | 25.40 | 28.65 | 100% |
| always call | 0 | 2.58 | 2.11 | 4.64 | 6.21 | 83% |
| always raise | 0 | 4.35 | 3.69 | 7.65 | 9.94 | 94% |

| margin | draw | share | answer | next best | gap (% pot a hand) | solver: fold / call / raise |
|---|---|---|---|---|---|---|
| 5+ under the price | no draw | 6.7% | fold | call | 14.9 | 100 / 0 / 0 |
| 5+ under the price | gutshot | 4.2% | fold | call | 10.1 | 95 / 5 / 0 |
| 5+ under the price | open-ended | 1.8% | fold | call | 4.4 | 68 / 30 / 2 |
| 5+ under the price | flush draw | 1.4% | fold | call | 3.5 | 77 / 22 / 1 |
| 0-5 under | no draw | 3.5% | fold | call | 7.9 | 95 / 5 / 0 |
| 0-5 under | gutshot | 2.3% | fold | call | 4.4 | 90 / 9 / 1 |
| 0-5 under | open-ended | 1.0% | call | fold | 0.4 | 55 / 41 / 4 |
| 0-5 under | flush draw | 1.6% | call | raise | 1.2 | 49 / 48 / 3 |
| 0-5 over | no draw | 5.2% | fold | call | 3.4 | 71 / 29 / 0 |
| 0-5 over | gutshot | 2.7% | fold | call | 2.0 | 72 / 27 / 1 |
| 0-5 over | open-ended | 1.0% | call | raise | 1.0 | 39 / 57 / 4 |
| 0-5 over | flush draw | 2.3% | call | raise | 1.1 | 19 / 77 / 4 |
| 5-15 over | no draw | 15.6% | call | fold | 0.3 | 58 / 41 / 1 |
| 5-15 over | gutshot | 4.5% | call | fold | 1.1 | 48 / 50 / 2 |
| 5-15 over | open-ended | 1.2% | call | raise | 1.2 | 19 / 75 / 6 |
| 5-15 over | flush draw | 4.6% | call | raise | 1.2 | 9 / 86 / 5 |
| 15-30 over | no draw | 15.5% | call | raise | 1.5 | 12 / 84 / 3 |
| 15-30 over | gutshot | 2.6% | call | raise | 1.4 | 5 / 88 / 7 |
| 15-30 over | open-ended | 0.7% | call | raise | 0.9 | 1 / 89 / 10 |
| 15-30 over | flush draw | 4.7% | call | raise | 1.7 | 0 / 93 / 6 |
| 30+ over | no draw | 12.8% | call | raise | 0.9 | 0 / 89 / 11 |
| 30+ over | gutshot | 2.3% | call | raise | 0.7 | 0 / 87 / 13 |
| 30+ over | flush draw | 1.6% | call | raise | 1.2 | 0 / 91 / 9 |

## flop, out of position, facing a bet (406 decisions; the solver: call 47%, raise 14%)

| table | cells | EV lost: mean | median | P90 | P95 | over 1% pot |
|---|---|---|---|---|---|---|
| **kept**: margin x draw | 24 | 0.23 | 0.15 | 0.52 | 0.69 | 1% |
| best of any size: row x margin x draw x my range x range equity | 1728 | 0.20 | 0.14 | 0.46 | 0.62 | 0% |
| the kept table without "raise" | 24 | 0.23 | 0.15 | 0.52 | 0.69 | 1% |
| always fold | 0 | 22.07 | 24.02 | 27.71 | 32.13 | 100% |
| always call | 0 | 2.23 | 1.70 | 5.22 | 6.17 | 71% |
| always raise | 0 | 3.88 | 2.83 | 8.61 | 9.83 | 87% |

| margin | draw | share | answer | next best | gap (% pot a hand) | solver: fold / call / raise |
|---|---|---|---|---|---|---|
| 5+ under the price | no draw | 6.5% | fold | call | 14.3 | 100 / 0 / 0 |
| 0-5 under | no draw | 4.9% | fold | call | 7.3 | 98 / 1 / 0 |
| 0-5 under | gutshot | 0.7% | fold | call | 0.1 | 54 / 32 / 15 |
| 0-5 over | no draw | 6.4% | fold | call | 4.8 | 92 / 6 / 2 |
| 0-5 over | gutshot | 1.2% | call | raise | 0.6 | 45 / 39 / 16 |
| 5-15 over | no draw | 15.5% | fold | call | 2.5 | 81 / 16 / 4 |
| 5-15 over | gutshot | 3.2% | call | raise | 0.3 | 17 / 58 / 25 |
| 5-15 over | open-ended | 0.9% | call | raise | 0.1 | 0 / 60 / 40 |
| 5-15 over | flush draw | 0.6% | call | raise | 0.3 | 1 / 79 / 20 |
| 15-30 over | no draw | 26.2% | call | raise | 1.5 | 27 / 63 / 9 |
| 15-30 over | gutshot | 3.2% | call | raise | 0.4 | 10 / 69 / 21 |
| 15-30 over | open-ended | 1.4% | call | raise | 0.0 | -0 / 55 / 45 |
| 15-30 over | flush draw | 2.5% | call | raise | 0.1 | 0 / 66 / 34 |
| 30+ over | no draw | 21.9% | call | raise | 0.2 | 0 / 76 / 24 |
| 30+ over | gutshot | 1.3% | call | raise | 0.1 | 0 / 68 / 32 |
| 30+ over | open-ended | 0.5% | call | raise | 0.1 | 0 / 72 / 28 |
| 30+ over | flush draw | 2.9% | call | raise | 0.2 | 0 / 68 / 32 |

## flop, in position, facing a bet (352 decisions; the solver: call 63%, raise 6%)

| table | cells | EV lost: mean | median | P90 | P95 | over 1% pot |
|---|---|---|---|---|---|---|
| **kept**: margin x draw | 24 | 0.26 | 0.21 | 0.54 | 0.62 | 1% |
| best of any size: row x margin x draw x my range x who bet last street | 1728 | 0.22 | 0.16 | 0.49 | 0.61 | 1% |
| the kept table without "raise" | 24 | 0.26 | 0.21 | 0.54 | 0.62 | 1% |
| always fold | 0 | 23.96 | 23.77 | 30.26 | 31.50 | 100% |
| always call | 0 | 0.96 | 0.79 | 2.02 | 2.36 | 37% |
| always raise | 0 | 1.76 | 1.10 | 3.79 | 5.71 | 54% |

| margin | draw | share | answer | next best | gap (% pot a hand) | solver: fold / call / raise |
|---|---|---|---|---|---|---|
| 5+ under the price | no draw | 2.9% | fold | call | 6.9 | 96 / 3 / 0 |
| 0-5 under | no draw | 4.3% | fold | call | 4.0 | 90 / 9 / 1 |
| 0-5 over | no draw | 8.0% | fold | call | 2.4 | 81 / 17 / 1 |
| 0-5 over | gutshot | 0.8% | call | raise | 0.9 | 25 / 69 / 6 |
| 5-15 over | no draw | 21.2% | fold | call | 0.6 | 61 / 36 / 2 |
| 5-15 over | gutshot | 3.8% | call | raise | 0.5 | 15 / 79 / 7 |
| 5-15 over | open-ended | 0.9% | call | raise | 0.9 | 2 / 92 / 6 |
| 15-30 over | no draw | 21.6% | call | raise | 0.5 | 15 / 77 / 8 |
| 15-30 over | gutshot | 3.7% | call | raise | 0.3 | 5 / 86 / 10 |
| 15-30 over | open-ended | 1.3% | call | raise | 0.1 | -0 / 91 / 9 |
| 15-30 over | flush draw | 3.0% | call | raise | 0.6 | 0 / 93 / 7 |
| 30+ over | no draw | 23.1% | call | raise | 0.5 | 0 / 89 / 11 |
| 30+ over | gutshot | 1.2% | call | raise | 0.2 | 0 / 82 / 18 |
| 30+ over | open-ended | 0.4% | call | raise | 0.2 | 0 / 87 / 13 |
| 30+ over | flush draw | 3.0% | call | raise | 0.5 | 0 / 90 / 10 |

## river, out of position, first to act (300 decisions; the solver: bet 27%, bet big 7%)

| table | cells | EV lost: mean | median | P90 | P95 | over 1% pot |
|---|---|---|---|---|---|---|
| **kept**: equity x range equity | 18 | 0.50 | 0.43 | 0.93 | 1.43 | 8% |
| best of any size: equity x range equity x who bet last street | 54 | 0.38 | 0.34 | 0.76 | 0.97 | 5% |
| the kept table without "bet big" | 18 | 0.50 | 0.43 | 0.93 | 1.43 | 8% |
| always check | 0 | 0.75 | 0.49 | 1.65 | 2.28 | 27% |
| always bet | 0 | 2.03 | 1.47 | 4.33 | 5.67 | 67% |
| always bet big | 0 | 7.63 | 4.88 | 16.31 | 23.31 | 92% |

| equity | range equity | share | answer | next best | gap (% pot a hand) | solver: check / bet / bet big |
|---|---|---|---|---|---|---|
| under 20% | under 45% | 12.8% | check | bet | 1.4 | 81 / 11 / 8 |
| under 20% | 45-55% | 7.4% | check | bet | 0.4 | 61 / 28 / 11 |
| under 20% | over 55% | 3.1% | bet | bet big | 0.4 | 20 / 60 / 21 |
| 20-35% | under 45% | 3.4% | check | bet | 4.7 | 98 / 1 / 1 |
| 20-35% | 45-55% | 6.1% | check | bet | 3.9 | 96 / 3 / 1 |
| 20-35% | over 55% | 2.5% | check | bet | 0.7 | 71 / 23 / 7 |
| 35-50% | under 45% | 3.1% | check | bet | 3.8 | 86 / 13 / 0 |
| 35-50% | 45-55% | 6.9% | check | bet | 5.0 | 99 / 1 / 0 |
| 35-50% | over 55% | 4.1% | check | bet | 3.8 | 93 / 5 / 2 |
| 50-65% | under 45% | 2.9% | check | bet | 1.1 | 68 / 32 / 0 |
| 50-65% | 45-55% | 5.3% | check | bet | 1.6 | 82 / 18 / 0 |
| 50-65% | over 55% | 5.4% | check | bet | 2.8 | 94 / 6 / 0 |
| 65-80% | under 45% | 2.8% | bet | check | 0.5 | 34 / 63 / 3 |
| 65-80% | 45-55% | 4.9% | bet | check | 0.1 | 42 / 58 / 0 |
| 65-80% | over 55% | 5.8% | bet | check | 0.0 | 50 / 50 / 0 |
| 80%+ | under 45% | 5.3% | bet | check | 0.2 | 33 / 35 / 32 |
| 80%+ | 45-55% | 8.5% | check | bet | 0.4 | 45 / 39 / 16 |
| 80%+ | over 55% | 9.8% | bet | check | 0.4 | 33 / 53 / 15 |

## river, in position, first to act (300 decisions; the solver: bet 34%, bet big 13%)

| table | cells | EV lost: mean | median | P90 | P95 | over 1% pot |
|---|---|---|---|---|---|---|
| **kept**: equity x his weak hands | 18 | 0.62 | 0.45 | 1.28 | 1.65 | 19% |
| best of any size: row x equity x his weak hands | 144 | 0.57 | 0.43 | 1.13 | 1.54 | 14% |
| the kept table without "bet big" | 18 | 0.62 | 0.45 | 1.28 | 1.65 | 19% |
| always check | 0 | 6.12 | 5.58 | 9.81 | 11.27 | 99% |
| always bet | 0 | 1.81 | 1.53 | 3.50 | 4.21 | 76% |
| always bet big | 0 | 5.06 | 4.82 | 9.08 | 10.35 | 92% |

| equity | his weak hands | share | answer | next best | gap (% pot a hand) | solver: check / bet / bet big |
|---|---|---|---|---|---|---|
| under 20% | under 20% | 15.1% | check | bet | 0.9 | 69 / 17 / 13 |
| under 20% | 20-45% | 5.5% | bet | bet big | 0.9 | 44 / 41 / 15 |
| under 20% | over 45% | 3.7% | bet | bet big | 0.7 | 17 / 59 / 24 |
| 20-35% | under 20% | 1.5% | check | bet | 6.4 | 98 / 1 / 1 |
| 20-35% | 20-45% | 2.4% | check | bet | 3.7 | 85 / 9 / 6 |
| 20-35% | over 45% | 1.6% | bet | bet big | 1.2 | 40 / 41 / 19 |
| 35-50% | under 20% | 1.4% | check | bet | 4.9 | 97 / 2 / 1 |
| 35-50% | 20-45% | 2.5% | check | bet | 6.4 | 95 / 4 / 1 |
| 35-50% | over 45% | 2.4% | check | bet | 0.5 | 66 / 23 / 11 |
| 50-65% | under 20% | 2.0% | check | bet | 5.0 | 98 / 2 / 0 |
| 50-65% | 20-45% | 2.3% | check | bet | 5.8 | 95 / 4 / 1 |
| 50-65% | over 45% | 4.1% | check | bet | 3.9 | 90 / 7 / 3 |
| 65-80% | under 20% | 4.7% | check | bet | 1.0 | 72 / 25 / 3 |
| 65-80% | 20-45% | 2.8% | check | bet | 1.6 | 78 / 20 / 1 |
| 65-80% | over 45% | 6.1% | check | bet | 2.5 | 86 / 12 / 2 |
| 80%+ | under 20% | 10.7% | bet | bet big | 1.5 | 11 / 56 / 33 |
| 80%+ | 20-45% | 9.4% | bet | bet big | 2.4 | 14 / 67 / 19 |
| 80%+ | over 45% | 21.8% | bet | bet big | 2.1 | 39 / 47 / 15 |

## turn, out of position, first to act (2372 decisions; the solver: bet 29%, bet big 0%)

| table | cells | EV lost: mean | median | P90 | P95 | over 1% pot |
|---|---|---|---|---|---|---|
| **kept**: equity | 6 | 0.16 | 0.07 | 0.42 | 0.66 | 2% |
| best of any size: row x equity x stack to pot x who bet last street | 432 | 0.13 | 0.06 | 0.30 | 0.43 | 1% |
| the kept table without "bet big" | 6 | 0.16 | 0.07 | 0.42 | 0.66 | 2% |
| always check | 0 | 0.16 | 0.07 | 0.42 | 0.66 | 2% |
| always bet | 0 | 1.93 | 1.31 | 4.46 | 5.84 | 59% |
| always bet big | 0 | 35.39 | 29.32 | 76.49 | 88.69 | 95% |

| equity | share | answer | next best | gap (% pot a hand) | solver: check / bet / bet big |
|---|---|---|---|---|---|
| under 20% | 9.8% | check | bet | 2.2 | 78 / 22 / 0 |
| 20-35% | 21.5% | check | bet | 1.3 | 66 / 34 / 0 |
| 35-50% | 20.8% | check | bet | 3.0 | 81 / 19 / 0 |
| 50-65% | 17.2% | check | bet | 2.6 | 87 / 13 / 0 |
| 65-80% | 14.4% | check | bet | 1.0 | 65 / 34 / 1 |
| 80%+ | 16.2% | check | bet | 0.4 | 49 / 51 / 0 |

## turn, in position, first to act (2323 decisions; the solver: bet 40%, bet big 0%)

| table | cells | EV lost: mean | median | P90 | P95 | over 1% pot |
|---|---|---|---|---|---|---|
| **kept**: equity | 6 | 0.22 | 0.15 | 0.45 | 0.61 | 2% |
| best of any size: row x equity x stack to pot x range equity | 432 | 0.19 | 0.12 | 0.39 | 0.56 | 1% |
| the kept table without "bet big" | 6 | 0.22 | 0.15 | 0.45 | 0.61 | 2% |
| always check | 0 | 0.41 | 0.25 | 0.96 | 1.34 | 9% |
| always bet | 0 | 1.13 | 0.95 | 2.18 | 2.64 | 46% |
| always bet big | 0 | 34.44 | 31.55 | 69.40 | 82.67 | 95% |

| equity | share | answer | next best | gap (% pot a hand) | solver: check / bet / bet big |
|---|---|---|---|---|---|
| under 20% | 12.5% | check | bet | 0.5 | 61 / 39 / 0 |
| 20-35% | 19.5% | check | bet | 0.7 | 60 / 40 / 0 |
| 35-50% | 15.7% | check | bet | 2.0 | 70 / 30 / 0 |
| 50-65% | 13.8% | check | bet | 2.2 | 81 / 19 / 0 |
| 65-80% | 20.1% | check | bet | 0.5 | 60 / 40 / 0 |
| 80%+ | 18.3% | bet | check | 1.0 | 33 / 67 / 0 |

## flop, out of position, first to act (226 decisions; the solver: bet 19%, bet big 0%)

| table | cells | EV lost: mean | median | P90 | P95 | over 1% pot |
|---|---|---|---|---|---|---|
| **kept**: row | 8 | 0.05 | 0.01 | 0.09 | 0.15 | 1% |
| best of any size: row x top pair or better x range equity | 72 | 0.03 | 0.00 | 0.08 | 0.12 | 0% |
| the kept table without "bet big" | 8 | 0.05 | 0.01 | 0.09 | 0.15 | 1% |
| always check | 0 | 0.05 | 0.00 | 0.12 | 0.23 | 1% |
| always bet | 0 | 0.54 | 0.37 | 1.22 | 1.54 | 18% |
| always bet big | 0 | 89.29 | 92.82 | 144.54 | 157.76 | 100% |

| row | share | answer | next best | gap (% pot a hand) | solver: check / bet / bet big |
|---|---|---|---|---|---|
| air | 45.4% | check | bet | 0.6 | 83 / 17 / 0 |
| draw | 7.4% | check | bet | 0.1 | 82 / 18 / 0 |
| low pair | 13.2% | check | bet | 0.9 | 91 / 9 / 0 |
| middle pair | 11.8% | check | bet | 0.5 | 84 / 16 / 0 |
| top pair | 13.2% | check | bet | 0.2 | 76 / 24 / 0 |
| overpair | 3.2% | bet | check | 0.2 | 37 / 63 / 0 |
| two pair | 1.7% | bet | check | 0.0 | 73 / 27 / 0 |
| trips or better | 4.2% | check | bet | 0.2 | 76 / 24 / 0 |

## flop, in position, first to act (221 decisions; the solver: bet 54%, bet big 0%)

| table | cells | EV lost: mean | median | P90 | P95 | over 1% pot |
|---|---|---|---|---|---|---|
| **kept**: equity | 6 | 0.06 | 0.05 | 0.11 | 0.14 | 0% |
| best of any size: row x draw x my range x range equity | 288 | 0.05 | 0.04 | 0.10 | 0.13 | 0% |
| the kept table without "bet big" | 6 | 0.06 | 0.05 | 0.11 | 0.14 | 0% |
| always check | 0 | 0.12 | 0.08 | 0.24 | 0.28 | 0% |
| always bet | 0 | 0.09 | 0.08 | 0.18 | 0.26 | 0% |
| always bet big | 0 | 70.01 | 69.11 | 118.31 | 125.11 | 100% |

| equity | share | answer | next best | gap (% pot a hand) | solver: check / bet / bet big |
|---|---|---|---|---|---|
| under 20% | 2.2% | check | bet | 0.2 | 60 / 40 / 0 |
| 20-35% | 17.4% | check | bet | 0.0 | 47 / 53 / 0 |
| 35-50% | 28.1% | check | bet | 0.1 | 51 / 49 / 0 |
| 50-65% | 20.4% | check | bet | 0.0 | 53 / 47 / 0 |
| 65-80% | 20.4% | bet | check | 0.0 | 42 / 58 / 0 |
| 80%+ | 11.6% | bet | check | 0.4 | 22 / 78 / 0 |

## Summary

| situation | the kept table | cells | EV lost: mean | P90 | without the third answer | best of any size | always fold or check | always call or bet |
|---|---|---|---|---|---|---|---|---|
| river, out of position, facing a bet | margin | 6 | 0.18 | 0.49 | 1.41 | 0.16 | 13.18 | 8.00 |
| river, in position, facing a bet | margin | 6 | 0.33 | 0.85 | 1.91 | 0.26 | 19.28 | 7.13 |
| turn, out of position, facing a bet | margin x draw | 24 | 0.37 | 0.78 | 0.37 | 0.25 | 16.73 | 3.69 |
| turn, in position, facing a bet | margin x draw | 24 | 0.42 | 0.96 | 0.42 | 0.23 | 19.19 | 2.58 |
| flop, out of position, facing a bet | margin x draw | 24 | 0.23 | 0.52 | 0.23 | 0.20 | 22.07 | 2.23 |
| flop, in position, facing a bet | margin x draw | 24 | 0.26 | 0.54 | 0.26 | 0.22 | 23.96 | 0.96 |
| river, out of position, first to act | equity x range equity | 18 | 0.50 | 0.93 | 0.50 | 0.38 | 0.75 | 2.03 |
| river, in position, first to act | equity x his weak hands | 18 | 0.62 | 1.28 | 0.62 | 0.57 | 6.12 | 1.81 |
| turn, out of position, first to act | equity | 6 | 0.16 | 0.42 | 0.16 | 0.13 | 0.16 | 1.93 |
| turn, in position, first to act | equity | 6 | 0.22 | 0.45 | 0.22 | 0.19 | 0.41 | 1.13 |
| flop, out of position, first to act | row | 8 | 0.05 | 0.09 | 0.05 | 0.03 | 0.05 | 0.54 |
| flop, in position, first to act | equity | 6 | 0.06 | 0.11 | 0.06 | 0.05 | 0.12 | 0.09 |
