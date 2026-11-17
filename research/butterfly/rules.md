# Written rules, scored on unseen spots (6731 decisions, 41 spots)

EV lost in percent of the pot per decision. Each table's calls are made on four fifths of the spots and scored on the rest.


## flop, out of position, first to act (41 decisions)

| table | cells | EV lost: mean | median | P90 | P95 | over 1% pot | opposite calls |
|---|---|---|---|---|---|---|---|
| best of all: equity x draw x my range x who bet last street | 216 | 0.09 | 0.04 | 0.20 | 0.25 | 0% | 7.0% |
| **kept**: equity | 6 | 0.11 | 0.02 | 0.25 | 0.33 | 2% | 8.7% |
| best with no read of the spot: equity | 6 | 0.11 | 0.02 | 0.25 | 0.33 | 2% | 8.7% |
| hand only: row | 8 | 0.14 | 0.09 | 0.29 | 0.36 | 2% | 9.9% |
| hand only: row x half | 16 | 0.13 | 0.05 | 0.25 | 0.32 | 2% | 9.1% |

| equity | share of range | call | lost by the other call (% pot per hand) | the solver acts |
|---|---|---|---|---|
| under 20% | 6.6% | no | 1.7 | 18% |
| 20-35% | 21.7% | no | 1.0 | 22% |
| 35-50% | 29.5% | no | 0.6 | 23% |
| 50-65% | 17.5% | no | 0.5 | 29% |
| 65-80% | 15.5% | no | 0.3 | 42% |
| 80%+ | 9.2% | no | 0.3 | 50% |

## flop, in position, first to act (41 decisions)

| table | cells | EV lost: mean | median | P90 | P95 | over 1% pot | opposite calls |
|---|---|---|---|---|---|---|---|
| best of all: row x draw x stack to pot x range equity | 288 | 0.15 | 0.10 | 0.29 | 0.51 | 0% | 7.1% |
| **kept**: row x stack to pot | 24 | 0.18 | 0.11 | 0.44 | 0.51 | 0% | 9.4% |
| best with no read of the spot: equity x draw | 24 | 0.22 | 0.17 | 0.41 | 0.48 | 2% | 12.1% |
| hand only: row | 8 | 0.24 | 0.19 | 0.44 | 0.57 | 2% | 13.2% |
| hand only: row x half | 16 | 0.25 | 0.19 | 0.49 | 0.57 | 2% | 13.3% |

| row | stack to pot | share of range | call | lost by the other call (% pot per hand) | the solver acts |
|---|---|---|---|---|---|
| air | under 2 | 12.8% | no | 1.1 | 36% |
| air | 2 to 6 | 14.6% | either | 0.2 | 62% |
| air | over 6 | 9.6% | either | 0.0 | 54% |
| draw | under 2 | 2.0% | no | 0.5 | 37% |
| draw | 2 to 6 | 1.9% | act | 0.5 | 64% |
| draw | over 6 | 1.7% | act | 1.0 | 71% |
| low pair | under 2 | 2.7% | no | 4.1 | 12% |
| low pair | 2 to 6 | 4.8% | no | 0.5 | 42% |
| low pair | over 6 | 4.1% | no | 0.2 | 37% |
| middle pair | under 2 | 2.7% | no | 0.3 | 33% |
| middle pair | 2 to 6 | 5.1% | either | 0.1 | 47% |
| middle pair | over 6 | 4.4% | either | 0.1 | 34% |
| top pair | under 2 | 3.4% | no | 0.3 | 48% |
| top pair | 2 to 6 | 5.3% | act | 0.2 | 57% |
| top pair | over 6 | 4.8% | act | 0.4 | 44% |
| overpair | under 2 | 8.1% | act | 0.4 | 59% |
| overpair | 2 to 6 | 4.9% | act | 3.3 | 77% |
| overpair | over 6 | 0.6% | act | 7.4 | 94% |
| two pair | 2 to 6 | 0.6% | act | 3.4 | 74% |
| two pair | over 6 | 0.8% | act | 13.3 | 96% |
| trips or better | under 2 | 2.4% | no | 1.7 | 24% |
| trips or better | 2 to 6 | 1.9% | act | 11.3 | 87% |
| trips or better | over 6 | 0.8% | act | 31.7 | 100% |

## turn, out of position, first to act (303 decisions)

| table | cells | EV lost: mean | median | P90 | P95 | over 1% pot | opposite calls |
|---|---|---|---|---|---|---|---|
| best of all: row x stack to pot x who bet last street | 72 | 0.23 | 0.12 | 0.56 | 0.87 | 4% | 10.5% |
| **kept**: row x who bet last street | 24 | 0.28 | 0.13 | 0.68 | 1.11 | 6% | 11.3% |
| best with no read of the spot: row x equity | 48 | 0.29 | 0.17 | 0.65 | 1.07 | 6% | 12.9% |
| hand only: row | 8 | 0.32 | 0.19 | 0.81 | 1.12 | 7% | 15.0% |
| hand only: row x half | 16 | 0.32 | 0.19 | 0.81 | 1.12 | 7% | 15.0% |

| row | who bet last street | share of range | call | lost by the other call (% pot per hand) | the solver acts |
|---|---|---|---|---|---|
| air | nobody | 12.2% | no | 2.7 | 21% |
| air | I did | 5.3% | no | 1.9 | 35% |
| air | he did | 6.5% | no | 5.8 | 5% |
| draw | nobody | 3.1% | act | 2.0 | 80% |
| draw | I did | 2.3% | act | 1.4 | 77% |
| draw | he did | 2.9% | no | 1.0 | 34% |
| low pair | nobody | 7.2% | no | 2.4 | 17% |
| low pair | I did | 1.5% | no | 2.1 | 37% |
| low pair | he did | 4.9% | no | 3.9 | 9% |
| middle pair | nobody | 5.2% | no | 1.7 | 21% |
| middle pair | I did | 2.1% | no | 5.6 | 23% |
| middle pair | he did | 7.1% | no | 2.4 | 10% |
| top pair | nobody | 4.9% | no | 0.6 | 43% |
| top pair | I did | 3.6% | no | 0.6 | 58% |
| top pair | he did | 7.9% | no | 1.4 | 17% |
| overpair | nobody | 2.6% | either | 0.1 | 54% |
| overpair | I did | 5.0% | act | 0.6 | 81% |
| overpair | he did | 2.7% | no | 2.2 | 15% |
| two pair | nobody | 0.8% | act | 0.3 | 53% |
| two pair | I did | 0.5% | no | 1.2 | 62% |
| two pair | he did | 1.3% | no | 0.8 | 21% |
| trips or better | nobody | 3.6% | either | 0.2 | 53% |
| trips or better | I did | 2.5% | either | 0.2 | 52% |
| trips or better | he did | 4.3% | no | 2.0 | 21% |

## turn, in position, first to act (307 decisions)

| table | cells | EV lost: mean | median | P90 | P95 | over 1% pot | opposite calls |
|---|---|---|---|---|---|---|---|
| best of all: equity x draw x who bet last street | 72 | 0.38 | 0.28 | 0.77 | 1.01 | 5% | 14.4% |
| **kept**: equity x draw | 24 | 0.43 | 0.33 | 0.82 | 1.03 | 6% | 16.0% |
| best with no read of the spot: row x equity x draw | 192 | 0.39 | 0.28 | 0.79 | 1.10 | 6% | 14.0% |
| hand only: row | 8 | 0.55 | 0.39 | 1.09 | 1.60 | 13% | 17.4% |
| hand only: row x half | 16 | 0.50 | 0.36 | 1.03 | 1.38 | 11% | 16.1% |

| equity | draw | share of range | call | lost by the other call (% pot per hand) | the solver acts |
|---|---|---|---|---|---|
| under 20% | no draw | 12.2% | no | 1.3 | 34% |
| under 20% | gutshot | 3.9% | no | 1.6 | 47% |
| under 20% | open-ended | 0.3% | act | 1.1 | 75% |
| under 20% | flush draw | 0.3% | no | 1.2 | 34% |
| 20-35% | no draw | 8.0% | no | 2.0 | 34% |
| 20-35% | gutshot | 3.3% | no | 0.2 | 61% |
| 20-35% | open-ended | 1.9% | act | 1.8 | 80% |
| 20-35% | flush draw | 3.0% | act | 2.1 | 72% |
| 35-50% | no draw | 6.9% | no | 2.5 | 26% |
| 35-50% | gutshot | 1.4% | no | 2.0 | 42% |
| 35-50% | open-ended | 0.5% | act | 0.5 | 61% |
| 35-50% | flush draw | 2.7% | act | 3.5 | 82% |
| 50-65% | no draw | 8.8% | no | 2.0 | 23% |
| 50-65% | gutshot | 1.2% | no | 2.8 | 16% |
| 50-65% | open-ended | 0.4% | no | 1.7 | 25% |
| 50-65% | flush draw | 1.9% | act | 0.4 | 57% |
| 65-80% | no draw | 15.9% | no | 0.3 | 47% |
| 65-80% | gutshot | 1.8% | no | 0.6 | 34% |
| 65-80% | open-ended | 0.6% | act | 0.3 | 56% |
| 65-80% | flush draw | 1.9% | act | 0.2 | 50% |
| 80%+ | no draw | 20.4% | act | 6.5 | 72% |
| 80%+ | gutshot | 0.6% | act | 0.7 | 42% |
| 80%+ | flush draw | 2.0% | act | 2.8 | 62% |

## river, out of position, first to act (1436 decisions)

| table | cells | EV lost: mean | median | P90 | P95 | over 1% pot | opposite calls |
|---|---|---|---|---|---|---|---|
| best of all: equity x range equity x who bet last street | 54 | 0.42 | 0.24 | 1.07 | 1.61 | 11% | 12.2% |
| **kept**: equity x his weak hands | 18 | 0.50 | 0.23 | 1.27 | 1.82 | 15% | 14.7% |
| best with no read of the spot: row x equity | 48 | 0.76 | 0.34 | 1.89 | 2.82 | 24% | 17.4% |
| hand only: row | 8 | 0.88 | 0.41 | 2.20 | 3.24 | 29% | 20.9% |
| hand only: row x half | 16 | 0.86 | 0.43 | 2.07 | 3.21 | 28% | 20.5% |

| equity | his weak hands | share of range | call | lost by the other call (% pot per hand) | the solver acts |
|---|---|---|---|---|---|
| under 20% | under 20% of his range | 14.2% | no | 1.7 | 24% |
| under 20% | 20-45% | 5.0% | no | 0.9 | 39% |
| under 20% | over 45% | 1.7% | act | 10.4 | 73% |
| 20-35% | under 20% of his range | 2.4% | no | 5.2 | 8% |
| 20-35% | 20-45% | 6.4% | no | 5.7 | 11% |
| 20-35% | over 45% | 1.5% | no | 1.4 | 37% |
| 35-50% | under 20% of his range | 1.7% | no | 5.1 | 24% |
| 35-50% | 20-45% | 8.6% | no | 7.5 | 7% |
| 35-50% | over 45% | 5.1% | no | 5.9 | 12% |
| 50-65% | under 20% of his range | 2.8% | no | 1.3 | 50% |
| 50-65% | 20-45% | 4.4% | no | 4.3 | 16% |
| 50-65% | over 45% | 8.5% | no | 5.8 | 10% |
| 65-80% | under 20% of his range | 3.2% | act | 1.0 | 75% |
| 65-80% | 20-45% | 4.2% | no | 1.0 | 40% |
| 65-80% | over 45% | 5.4% | no | 2.4 | 24% |
| 80%+ | under 20% of his range | 7.5% | act | 2.1 | 81% |
| 80%+ | 20-45% | 8.5% | no | 0.5 | 51% |
| 80%+ | over 45% | 9.1% | no | 0.7 | 47% |

## river, in position, first to act (1450 decisions)

| table | cells | EV lost: mean | median | P90 | P95 | over 1% pot | opposite calls |
|---|---|---|---|---|---|---|---|
| best of all: row x equity x my range x his weak hands | 432 | 0.58 | 0.30 | 1.43 | 2.06 | 17% | 10.6% |
| **kept**: equity x his weak hands | 18 | 0.77 | 0.42 | 1.89 | 2.57 | 25% | 14.1% |
| best with no read of the spot: row x equity | 48 | 1.08 | 0.60 | 2.57 | 3.89 | 33% | 17.2% |
| hand only: row | 8 | 1.71 | 0.98 | 4.07 | 5.63 | 50% | 21.4% |
| hand only: row x half | 16 | 1.64 | 0.89 | 4.10 | 5.73 | 47% | 17.8% |

| equity | his weak hands | share of range | call | lost by the other call (% pot per hand) | the solver acts |
|---|---|---|---|---|---|
| under 20% | under 20% of his range | 20.9% | no | 2.8 | 27% |
| under 20% | 20-45% | 3.6% | act | 1.4 | 54% |
| under 20% | over 45% | 3.5% | act | 20.7 | 80% |
| 20-35% | under 20% of his range | 1.5% | no | 13.6 | 6% |
| 20-35% | 20-45% | 2.1% | no | 6.2 | 21% |
| 20-35% | over 45% | 1.5% | act | 7.3 | 60% |
| 35-50% | under 20% of his range | 1.5% | no | 14.8 | 6% |
| 35-50% | 20-45% | 1.7% | no | 11.8 | 8% |
| 35-50% | over 45% | 2.2% | act | 0.7 | 38% |
| 50-65% | under 20% of his range | 2.0% | no | 8.4 | 22% |
| 50-65% | 20-45% | 1.3% | no | 11.1 | 5% |
| 50-65% | over 45% | 3.0% | no | 5.1 | 24% |
| 65-80% | under 20% of his range | 7.1% | act | 2.3 | 71% |
| 65-80% | 20-45% | 2.5% | no | 0.5 | 55% |
| 65-80% | over 45% | 6.0% | no | 3.4 | 30% |
| 80%+ | under 20% of his range | 11.4% | act | 23.3 | 99% |
| 80%+ | 20-45% | 5.8% | act | 16.3 | 94% |
| 80%+ | over 45% | 22.5% | act | 4.6 | 67% |

## flop, out of position, facing a bet (80 decisions)

| table | cells | EV lost: mean | median | P90 | P95 | over 1% pot | opposite calls |
|---|---|---|---|---|---|---|---|
| best of all: margin x draw x stack to pot x who bet last street | 180 | 0.26 | 0.22 | 0.55 | 0.59 | 0% | 11.6% |
| **kept**: margin x draw | 20 | 0.38 | 0.23 | 0.60 | 0.93 | 5% | 11.9% |
| best with no read of the spot: row x margin | 40 | 0.32 | 0.26 | 0.62 | 0.70 | 0% | 9.9% |
| hand only: margin | 5 | 0.74 | 0.45 | 1.55 | 1.94 | 22% | 19.7% |
| hand only: row x margin | 40 | 0.32 | 0.26 | 0.62 | 0.70 | 0% | 9.9% |

| margin | draw | share of range | call | lost by the other call (% pot per hand) | the solver acts |
|---|---|---|---|---|---|
| 5+ under the price | no draw | 6.7% | no | 14.2 | 0% |
| 5+ under the price | gutshot | 0.4% | no | 3.8 | 8% |
| 0-5 under | no draw | 7.0% | no | 5.7 | 6% |
| 0-5 under | gutshot | 0.6% | no | 1.7 | 19% |
| 0-5 over | no draw | 8.0% | no | 2.5 | 38% |
| 0-5 over | gutshot | 0.8% | act | 1.4 | 59% |
| 5-15 over | no draw | 15.6% | no | 1.5 | 25% |
| 5-15 over | gutshot | 2.8% | act | 3.5 | 70% |
| 5-15 over | open-ended | 0.8% | act | 16.5 | 100% |
| 5-15 over | flush draw | 0.5% | act | 19.6 | 100% |
| 15+ over | no draw | 47.8% | act | 35.7 | 80% |
| 15+ over | gutshot | 3.4% | act | 13.8 | 96% |
| 15+ over | open-ended | 1.0% | act | 29.4 | 100% |
| 15+ over | flush draw | 4.6% | act | 49.5 | 100% |

## flop, in position, facing a bet (75 decisions)

| table | cells | EV lost: mean | median | P90 | P95 | over 1% pot | opposite calls |
|---|---|---|---|---|---|---|---|
| best of all: margin x draw x my range x who bet last street | 180 | 0.20 | 0.14 | 0.43 | 0.73 | 1% | 7.4% |
| **kept**: margin x draw | 20 | 0.28 | 0.18 | 0.67 | 0.83 | 4% | 9.1% |
| best with no read of the spot: margin x draw | 20 | 0.28 | 0.18 | 0.67 | 0.83 | 4% | 9.1% |
| hand only: margin | 5 | 0.34 | 0.26 | 0.70 | 0.84 | 4% | 9.9% |
| hand only: row x margin | 40 | 0.32 | 0.24 | 0.70 | 0.84 | 4% | 9.8% |

| margin | draw | share of range | call | lost by the other call (% pot per hand) | the solver acts |
|---|---|---|---|---|---|
| 5+ under the price | no draw | 9.0% | no | 10.2 | 3% |
| 5+ under the price | gutshot | 0.4% | no | 3.7 | 33% |
| 0-5 under | no draw | 7.2% | no | 3.8 | 10% |
| 0-5 under | gutshot | 0.6% | act | 1.9 | 71% |
| 0-5 over | no draw | 8.7% | no | 1.5 | 34% |
| 0-5 over | gutshot | 0.9% | act | 6.0 | 84% |
| 5-15 over | no draw | 13.9% | act | 0.5 | 50% |
| 5-15 over | gutshot | 2.9% | act | 6.5 | 84% |
| 5-15 over | open-ended | 1.1% | act | 15.9 | 94% |
| 15+ over | no draw | 45.7% | act | 52.1 | 94% |
| 15+ over | gutshot | 2.3% | act | 16.4 | 99% |
| 15+ over | open-ended | 1.2% | act | 30.3 | 100% |
| 15+ over | flush draw | 5.6% | act | 48.0 | 100% |

## turn, out of position, facing a bet (289 decisions)

| table | cells | EV lost: mean | median | P90 | P95 | over 1% pot | opposite calls |
|---|---|---|---|---|---|---|---|
| best of all: margin x draw x stack to pot x my range | 180 | 0.16 | 0.07 | 0.40 | 0.73 | 2% | 4.5% |
| **kept**: margin x stack to pot | 15 | 0.26 | 0.15 | 0.66 | 0.91 | 4% | 7.7% |
| best with no read of the spot: row x margin x draw | 160 | 0.20 | 0.09 | 0.49 | 0.85 | 3% | 4.9% |
| hand only: margin | 5 | 0.40 | 0.24 | 0.92 | 1.27 | 8% | 12.1% |
| hand only: row x margin | 40 | 0.26 | 0.11 | 0.74 | 1.01 | 6% | 6.0% |

| margin | stack to pot | share of range | call | lost by the other call (% pot per hand) | the solver acts |
|---|---|---|---|---|---|
| 5+ under the price | under 2 | 13.2% | no | 14.7 | 2% |
| 5+ under the price | 2 to 6 | 3.4% | no | 12.9 | 0% |
| 5+ under the price | over 6 | 2.3% | no | 18.5 | 0% |
| 0-5 under | under 2 | 7.2% | no | 3.6 | 13% |
| 0-5 under | 2 to 6 | 1.3% | no | 8.1 | 3% |
| 0-5 under | over 6 | 1.0% | no | 13.1 | 0% |
| 0-5 over | under 2 | 7.8% | no | 1.4 | 36% |
| 0-5 over | 2 to 6 | 1.8% | no | 6.6 | 3% |
| 0-5 over | over 6 | 0.5% | no | 8.9 | 4% |
| 5-15 over | under 2 | 16.2% | act | 1.7 | 48% |
| 5-15 over | 2 to 6 | 6.1% | no | 1.3 | 24% |
| 5-15 over | over 6 | 3.2% | no | 1.8 | 25% |
| 15+ over | under 2 | 20.2% | act | 46.3 | 96% |
| 15+ over | 2 to 6 | 11.3% | act | 29.7 | 90% |
| 15+ over | over 6 | 4.5% | act | 33.2 | 97% |

## turn, in position, facing a bet (242 decisions)

| table | cells | EV lost: mean | median | P90 | P95 | over 1% pot | opposite calls |
|---|---|---|---|---|---|---|---|
| best of all: margin x draw x stack to pot x my range | 180 | 0.21 | 0.08 | 0.44 | 0.67 | 2% | 6.6% |
| **kept**: margin x draw | 20 | 0.31 | 0.18 | 0.66 | 0.96 | 5% | 8.7% |
| best with no read of the spot: margin x draw | 20 | 0.31 | 0.18 | 0.66 | 0.96 | 5% | 8.7% |
| hand only: margin | 5 | 0.49 | 0.41 | 1.09 | 1.44 | 12% | 11.6% |
| hand only: row x margin | 40 | 0.34 | 0.20 | 0.67 | 1.03 | 5% | 8.8% |

| margin | draw | share of range | call | lost by the other call (% pot per hand) | the solver acts |
|---|---|---|---|---|---|
| 5+ under the price | no draw | 10.1% | no | 12.5 | 4% |
| 5+ under the price | gutshot | 3.9% | no | 7.3 | 14% |
| 5+ under the price | open-ended | 1.4% | act | 1.0 | 62% |
| 5+ under the price | flush draw | 0.6% | no | 3.1 | 38% |
| 0-5 under | no draw | 5.9% | no | 3.1 | 13% |
| 0-5 under | gutshot | 2.2% | no | 0.9 | 23% |
| 0-5 under | open-ended | 0.4% | act | 5.9 | 89% |
| 0-5 under | flush draw | 1.0% | act | 5.6 | 68% |
| 0-5 over | no draw | 7.5% | no | 1.2 | 36% |
| 0-5 over | gutshot | 1.9% | act | 0.3 | 55% |
| 0-5 over | open-ended | 0.7% | act | 1.8 | 59% |
| 0-5 over | flush draw | 1.6% | act | 7.5 | 90% |
| 5-15 over | no draw | 16.7% | act | 0.8 | 50% |
| 5-15 over | gutshot | 2.4% | act | 2.2 | 71% |
| 5-15 over | open-ended | 0.8% | act | 7.6 | 83% |
| 5-15 over | flush draw | 3.5% | act | 16.1 | 96% |
| 15+ over | no draw | 31.5% | act | 59.0 | 97% |
| 15+ over | gutshot | 2.1% | act | 15.9 | 99% |
| 15+ over | open-ended | 0.7% | act | 20.2 | 100% |
| 15+ over | flush draw | 5.2% | act | 40.7 | 100% |

## river, out of position, facing a bet (1386 decisions)

| table | cells | EV lost: mean | median | P90 | P95 | over 1% pot | opposite calls |
|---|---|---|---|---|---|---|---|
| best of all: margin | 5 | 0.00 | 0.00 | 0.00 | 0.00 | 0% | 0.4% |
| **kept**: margin | 5 | 0.00 | 0.00 | 0.00 | 0.00 | 0% | 0.4% |
| best with no read of the spot: margin | 5 | 0.00 | 0.00 | 0.00 | 0.00 | 0% | 0.4% |
| hand only: margin | 5 | 0.00 | 0.00 | 0.00 | 0.00 | 0% | 0.4% |
| hand only: row x margin | 40 | 0.00 | 0.00 | 0.00 | 0.00 | 0% | 0.4% |

| margin | share of range | call | lost by the other call (% pot per hand) | the solver acts |
|---|---|---|---|---|
| 5+ under the price | 24.3% | no | 25.3 | 0% |
| 0-5 under | 28.5% | no | 1.8 | 19% |
| 0-5 over | 24.3% | act | 1.4 | 71% |
| 5-15 over | 5.1% | act | 12.6 | 99% |
| 15+ over | 17.8% | act | 69.2 | 100% |

## river, in position, facing a bet (1081 decisions)

| table | cells | EV lost: mean | median | P90 | P95 | over 1% pot | opposite calls |
|---|---|---|---|---|---|---|---|
| best of all: margin | 5 | 0.00 | 0.00 | 0.00 | 0.00 | 0% | 0.7% |
| **kept**: margin | 5 | 0.00 | 0.00 | 0.00 | 0.00 | 0% | 0.7% |
| best with no read of the spot: margin | 5 | 0.00 | 0.00 | 0.00 | 0.00 | 0% | 0.7% |
| hand only: margin | 5 | 0.00 | 0.00 | 0.00 | 0.00 | 0% | 0.7% |
| hand only: row x margin | 40 | 0.00 | 0.00 | 0.00 | 0.00 | 0% | 0.7% |

| margin | share of range | call | lost by the other call (% pot per hand) | the solver acts |
|---|---|---|---|---|
| 5+ under the price | 20.8% | no | 26.8 | 1% |
| 0-5 under | 22.3% | no | 1.7 | 20% |
| 0-5 over | 24.2% | act | 1.5 | 70% |
| 5-15 over | 6.4% | act | 12.8 | 97% |
| 15+ over | 26.3% | act | 67.8 | 100% |

## Summary

| situation | the kept table | cells | EV lost: mean | P90 | over 1% pot | opposite calls |
|---|---|---|---|---|---|---|
| flop, out of position, first to act | equity | 6 | 0.11 | 0.25 | 2% | 8.7% |
| flop, in position, first to act | row x stack to pot | 24 | 0.18 | 0.44 | 0% | 9.4% |
| turn, out of position, first to act | row x who bet last street | 24 | 0.28 | 0.68 | 6% | 11.3% |
| turn, in position, first to act | equity x draw | 24 | 0.43 | 0.82 | 6% | 16.0% |
| river, out of position, first to act | equity x his weak hands | 18 | 0.50 | 1.27 | 15% | 14.7% |
| river, in position, first to act | equity x his weak hands | 18 | 0.77 | 1.89 | 25% | 14.1% |
| flop, out of position, facing a bet | margin x draw | 20 | 0.38 | 0.60 | 5% | 11.9% |
| flop, in position, facing a bet | margin x draw | 20 | 0.28 | 0.67 | 4% | 9.1% |
| turn, out of position, facing a bet | margin x stack to pot | 15 | 0.26 | 0.66 | 4% | 7.7% |
| turn, in position, facing a bet | margin x draw | 20 | 0.31 | 0.66 | 5% | 8.7% |
| river, out of position, facing a bet | margin | 5 | 0.00 | 0.00 | 0% | 0.4% |
| river, in position, facing a bet | margin | 5 | 0.00 | 0.00 | 0% | 0.7% |
