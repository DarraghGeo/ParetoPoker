# Is "who bet last" just the shape of the ranges? (33878 first-to-act and 23284 facing-a-bet decisions on solved turns and rivers)

Weak = under 35% equity against the other range, middle = 35-65%, strong = 65%+.

## 1. What each role's range is made of

| street | the player to act | decisions | own range: weak / middle / strong | his range: weak / middle / strong | bets |
|---|---|---|---|---|---|
| turn | bet the street before | 2180 | 41 / 25 / 34 | 23 / 51 / 26 | 46% |
| turn | called the street before | 2214 | 22 / 43 / 35 | 44 / 29 / 27 | 27% |
| turn | street before checked through | 1056 | 33 / 33 / 34 | 32 / 41 / 27 | 32% |
| river | bet the street before | 8290 | 41 / 15 / 45 | 24 / 47 / 28 | 52% |
| river | called the street before | 8293 | 21 / 34 / 45 | 49 / 18 / 33 | 29% |
| river | street before checked through | 11845 | 35 / 21 / 44 | 37 / 30 / 33 | 35% |

## 2. Bet frequency by how much of the range is weak

Turn:

| own weak share | all | bet the street before | called the street before | street before checked through |
|---|---|---|---|---|
| under 20% weak | 28% (1417) | 52% (71) | 25% (1177) | 38% (169) |
| 20-30% | 36% (1053) | 48% (306) | 28% (492) | 35% (255) |
| 30-40% | 40% (1275) | 48% (628) | 31% (288) | 32% (359) |
| 40-50% | 40% (1001) | 46% (675) | 27% (166) | 27% (160) |
| over 50% | 37% (704) | 42% (500) | 23% (91) | 25% (113) |

River:

| own weak share | all | bet the street before | called the street before | street before checked through |
|---|---|---|---|---|
| under 20% weak | 34% (8037) | 60% (381) | 29% (4943) | 38% (2713) |
| 20-30% | 44% (4256) | 59% (1205) | 37% (1038) | 39% (2013) |
| 30-40% | 43% (5251) | 56% (2137) | 30% (735) | 37% (2379) |
| 40-50% | 41% (5558) | 51% (2739) | 26% (654) | 34% (2165) |
| over 50% | 32% (5326) | 44% (1828) | 18% (923) | 28% (2575) |

## 3. How much of the bet frequency each read explains

Share of the variation in bet frequency explained by a straight-line rule on the read (0 = nothing, 100 = all).

| read | turn | river |
|---|---|---|
| who bet the street before | 17 | 19 |
| the seat | 8 | 12 |
| the range's equity | 1 | 5 |
| own weak share | 3 | 0 |
| own weak and strong shares | 25 | 31 |
| his weak and strong shares | 34 | 33 |
| both ranges' weak and strong shares | 42 | 43 |
| both ranges' shares and the seat | 43 | 44 |
| both ranges' shares, the seat and who bet before | 48 | 53 |

## 4. Strong hands (80%+ equity): bet, or let him bet?

First to act out of position, having called the street before: how often the strong hands bet.

| stack behind | turn | river |
|---|---|---|
| under 1 pot behind | 60% (182) | 39% (967) |
| 1 to 2.5 pots | 16% (163) | 9% (1192) |
| 2.5 to 6 pots | 48% (69) | 18% (1320) |
| over 6 pots | 3% (685) | 6% (977) |

Facing a bet with a raise available: how often the strong hands raise (and how often the whole range raises).

| stack behind after his bet | turn, out of position | turn, in position | river, out of position | river, in position |
|---|---|---|---|---|
| under 1 pot behind | 41%, range 16% (275) | 19%, range 14% (215) | 96%, range 14% (2387) | 93%, range 18% (1574) |
| 1 to 2.5 pots | 56%, range 13% (400) | 33%, range 9% (415) | 96%, range 13% (2374) | 91%, range 16% (1405) |
| 2.5 to 6 pots | 51%, range 9% (1348) | 28%, range 7% (720) | 98%, range 12% (4986) | 93%, range 12% (4040) |
| over 6 pots | 53%, range 8% (498) | 27%, range 7% (492) | 99%, range 12% (1084) | 90%, range 13% (1071) |
