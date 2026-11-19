# Do the general heuristics describe the solver? (1802 first-to-act decisions from stored solves)

Weak = under 35% equity, middle = 35-65%, strong = 65%+. Polarity: 0 when the middle bets as often as the ends (merged), 100 when the middle never bets.

## 1. Merged on the flop, polar later

| street | seat | decisions | bets | weak bets | middle bets | strong bets | polarity |
|---|---|---|---|---|---|---|---|
| flop | out of position | 226 | 19% | 39% | 38% | 50% | 17% |
| flop | in position | 221 | 54% | 55% | 48% | 64% | 20% |
| turn | out of position | 382 | 33% | 40% | 33% | 55% | 37% |
| turn | in position | 373 | 51% | 52% | 34% | 66% | 42% |
| river | out of position | 300 | 34% | 37% | 16% | 66% | 65% |
| river | in position | 300 | 48% | 55% | 13% | 64% | 78% |

(the band rates and polarity are over the decisions that bet at least 5% of the time)

## 2. Out of position: check unless ahead, then bet in proportion

Bet frequency by the range's equity (number of decisions in brackets).

| range equity | flop | turn | river |
|---|---|---|---|
| under 42% | 0% (23) | 23% (20) | 27% (60) |
| 42-47% | 2% (87) | 26% (67) | 30% (56) |
| 47-53% | 26% (94) | 33% (175) | 33% (69) |
| 53-58% | 74% (15) | 32% (88) | 37% (46) |
| 58%+ | 67% (7) | 52% (32) | 43% (69) |

flop: correlation of bet frequency with range equity +0.77; a straight line gives 45 points of betting for each 10 points of range equity, crossing 50% betting at 55% equity

turn: correlation of bet frequency with range equity +0.26; a straight line gives 13 points of betting for each 10 points of range equity, crossing 50% betting at 64% equity

river: correlation of bet frequency with range equity +0.23; a straight line gives 6 points of betting for each 10 points of range equity, crossing 50% betting at 78% equity

By who bet the street before (bet frequency, flop / turn / river):
- led: 59% / 51% / 53%
- followed: 5% / 15% / 9%
- none: - / 34% / 43%

## 3. In position, checked to: bet unless clearly behind

Bet frequency by the range's equity (number of decisions in brackets).

| range equity | flop | turn | river |
|---|---|---|---|
| under 42% | - | 50% (13) | 36% (39) |
| 42-47% | 40% (8) | 49% (61) | 44% (24) |
| 47-53% | 46% (75) | 49% (116) | 48% (48) |
| 53-58% | 55% (109) | 52% (105) | 50% (47) |
| 58%+ | 81% (26) | 54% (78) | 50% (142) |

flop: correlation of bet frequency with range equity +0.68; a straight line gives 26 points of betting for each 10 points of range equity, crossing 50% betting at 52% equity

turn: correlation of bet frequency with range equity +0.15; a straight line gives 3 points of betting for each 10 points of range equity, crossing 50% betting at 49% equity

river: correlation of bet frequency with range equity +0.27; a straight line gives 2 points of betting for each 10 points of range equity, crossing 50% betting at 70% equity

By who bet the street before (bet frequency, flop / turn / river):
- led: 57% / 57% / 53%
- followed: 45% / 50% / 47%
- none: - / 44% / 44%

## 4. Polarity goes with bet size

| street | seat | size | share of the range using it | weak | middle | strong | polarity |
|---|---|---|---|---|---|---|---|
| flop | out of position | small (about a third) | 8% | 22% | 24% | 27% | -4% |
| flop | out of position | medium (about three quarters) | 11% | 24% | 22% | 32% | 22% |
| flop | in position | small (about a third) | 41% | 44% | 39% | 50% | 18% |
| flop | in position | medium (about three quarters) | 13% | 19% | 17% | 24% | 24% |
| turn | out of position | small (about a third) | 17% | 25% | 22% | 34% | 30% |
| turn | out of position | medium (about three quarters) | 9% | 18% | 13% | 25% | 42% |
| turn | out of position | big (overbet or all-in) | 8% | 19% | 14% | 23% | 25% |
| turn | in position | small (about a third) | 29% | 35% | 24% | 42% | 36% |
| turn | in position | medium (about three quarters) | 17% | 21% | 13% | 30% | 50% |
| turn | in position | big (overbet or all-in) | 6% | 18% | 10% | 21% | 39% |
| river | out of position | small (about a third) | 17% | 18% | 14% | 35% | 32% |
| river | out of position | medium (about three quarters) | 11% | 17% | 3% | 28% | 89% |
| river | out of position | big (overbet or all-in) | 8% | 15% | 1% | 23% | 93% |
| river | in position | small (about a third) | 10% | 14% | 4% | 21% | 78% |
| river | in position | medium (about three quarters) | 26% | 32% | 6% | 38% | 79% |
| river | in position | big (overbet or all-in) | 15% | 25% | 6% | 24% | 73% |

(band rates and polarity over the decisions that use the size at least 3% of the time)

## 5. In position on the flop: merged whatever the equity?

| range equity | decisions | bets | weak | middle | strong | polarity |
|---|---|---|---|---|---|---|
| 42-47% | 8 | 40% | 32% | 35% | 57% | 22% |
| 47-53% | 75 | 46% | 47% | 39% | 60% | 26% |
| 53-58% | 109 | 55% | 56% | 49% | 63% | 18% |
| 58%+ | 26 | 81% | 85% | 78% | 83% | 7% |
