# The flop runs together (20 scoring flops with the game's value known)

Exploitability over the whole hand from the flop, percent of the pot as the flop starts. One bet size and one raise a street; each flop on a sample of turn and river cards.

| shared tables | flops solved on | scoring flops | OOP: mean | median | worst | IP: mean | median | worst | both |
|---|---|---|---|---|---|---|---|---|---|
| bal | 24 | 20 | 11.4 | 10.9 | 19.7 | 9.3 | 9.3 | 17.4 | 10.3 |
| place, strongest third, depth | 6 | 5 | 12.2 | 11.3 | 16.4 | 13.5 | 13.6 | 21.3 | 12.8 |
| place, strongest third, depth | 12 | 20 | 10.6 | 10.5 | 17.5 | 9.5 | 9.4 | 22.9 | 10.1 |

## Flop by flop (shared tables solved on 12 flops: place, strongest third, depth)

| flop | pot | stacks behind | OOP range equity | OOP | IP | alone: OOP | IP |
|---|---|---|---|---|---|---|---|
| 8h Td 5s | 3BP-SB-BU | 3.9 | 51% | 13.5 | 22.9 | 7.3 | 10.8 |
| Jc Qs 3s | 3BP-SB-BU | 3.9 | 55% | 12.8 | 18.7 | 1.7 | 11.9 |
| 5c 8h 6s | 3BP-SB-BU | 3.9 | 48% | 4.9 | 20.8 | - | - |
| 5d 2s 5c | 3BP-SB-BU | 3.9 | 51% | 17.5 | 7.9 | 13.0 | 3.0 |
| Ks 3s 6c | 3BP-SB-BU | 3.9 | 56% | 13.6 | 11.7 | 8.7 | 4.4 |
| 3s 9d Jd | SRP-BB-BU | 17.7 | 47% | 10.5 | 12.0 | 9.1 | 6.6 |
| 2s Js Qs | SRP-BB-BU | 17.7 | 47% | 5.9 | 14.2 | 5.1 | 10.7 |
| Kh 7c Jc | SRP-BB-UTG | 17.7 | 40% | 7.9 | 11.9 | 4.6 | 4.1 |
| 7h Kc Ad | 3BP-SB-BU | 3.9 | 61% | 13.2 | 6.3 | - | - |
| 7d 4s Ts | SRP-BB-BU | 17.7 | 48% | 7.3 | 11.2 | - | - |
| 3h 3d 4c | 3BP-SB-BU | 3.9 | 52% | 6.6 | 11.6 | - | - |
| 7s 6d 6c | SRP-BB-CO | 17.7 | 48% | 10.5 | 7.7 | - | - |
| Ks Jc 3h | SRP-BB-BU | 17.7 | 44% | 9.5 | 8.6 | 5.3 | 7.9 |
| 4c Qs Jh | SRP-BB-CO | 17.7 | 44% | 6.5 | 10.1 | - | - |
| 6c Td Qd | SRP-BB-CO | 17.7 | 46% | 16.1 | 0.2 | - | - |
| Qd Js 7d | SRP-BB-CO | 17.7 | 45% | 12.9 | 2.8 | 11.6 | 4.8 |
| 6s 6d 9s | SRP-BB-BU | 17.7 | 47% | 8.6 | 6.8 | - | - |
| 5s Ts Ac | SRP-BB-UTG | 17.7 | 39% | 11.6 | 3.4 | - | - |
| Ah 4h Jc | SRP-BB-BU | 17.7 | 46% | 10.5 | 2.2 | - | - |
| 2d 7h 6s | SRP-BB-UTG | 17.7 | 51% | 12.6 | -0.4 | - | - |

On the 9 flops also solved alone: alone 7.4 / 7.1, shared 11.6 / 12.3.

## What goes with a high figure

| about the flop | correlation with OOP exploitability | with IP |
|---|---|---|
| stacks behind, in pots | -0.24 | -0.56 |
| out of position's range equity | +0.34 | +0.21 |
| OOP strong hands minus IP strong hands | +0.36 | +0.21 |
| OOP share of weak hands | -0.25 | -0.15 |
| IP share of weak hands | +0.27 | +0.09 |
| two or more of a suit | +0.03 | -0.16 |
| paired | +0.03 | -0.08 |
| highest card | +0.06 | -0.12 |
| gap between highest and lowest card | +0.04 | -0.03 |

single-raised pots (13): 10.0 / 7.0

3-bet pots (7): 11.7 / 14.3
