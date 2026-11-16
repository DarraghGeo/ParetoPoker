# What makes range advantage readable

`collect.mjs` computes each range's equity against the other on sampled flops for every preset matchup (no solving). `analyse.py` sets that beside things a player can count at the table. First run: 672 flops over 30 matchups (the collection was stopped part way).

Range advantage varies by 5.6 points of equity across these flops, 4.4 within one matchup.

| What you know | Off by | Names the player with the advantage (where it is over 1.5 points) |
|---|---|---|
| The matchup alone: who usually has it | 3.6 pts | 78% |
| + who has more pairs or better | 3.3 | 80% |
| + who has more overpairs | 3.5 | 79% |
| + who has more top pair or better (top pair, overpairs, two pair, sets) | **2.4** | **85%** |
| Top pair or better, without knowing the matchup | 2.9 | 81% |
| All the counts with the matchup | 1.3 | 96% |

- One count carries most of it: **how much of each range has top pair or better on this board** (correlation with the advantage 0.78; 0.80 inside a matchup).
- Any pair at all is a poor guide across matchups (0.20): small pairs are not an advantage. Overpairs alone are too rare to decide it (0.37). Flush draws do not move it (-0.05).
- Who has more strong hands (75%+ equity) is mostly a property of the matchup (92% from the matchup alone); the board adds less.

## By size of the advantage (1,103 flops)

Names the right player: under 1.5 points 53%, 1.5 to 4 points 68%, 4 to 8 points 96%, over 8 points 99% (matchup plus top pair or better). Adding any pair lifts the 1.5-to-4 band to 80%. The misses are on boards where the answer is "about even".

## After betting: turn and river (`runouts.py`)

7,744 turn and river decisions on 131 solved flops; each range is what the action has left. Advantages are much larger here (sd 13.8 points against 5.6 on the flop): 32% of turn decisions and 65% of river decisions have an advantage over 8 points.

| | Turn, 4-8 pts / over 8 | River, 4-8 pts / over 8 |
|---|---|---|
| The line alone (who usually has it after this action) | 72% / 83% | 80% / 91% |
| Top pair or better alone | 79% / 95% | 74% / 86% |
| Line + top pair or better | 83% / 97% | 81% / 95% |
| Line + top pair or better + any pair | 91% / 99% | 84% / 95% |

- The count still goes with the advantage (correlation 0.74 on the turn, 0.76 on the river) but decides less by itself than on the flop.
- **Facing a bet, the action is the answer**: the player who bet has the advantage, and the line alone names the right player 91 to 100% of the time once the advantage is over 1.5 points. The count adds nothing.
- **Before a bet**, the count plus any pair is what works: 84% at 4 to 8 points, 95% over 8.
- **On the river, top pair is no longer the right bar.** Two pair or better matters as much (0.64 against 0.43 on the turn); with all three counts the river reaches 85% and 96%.

## Nut advantage (`nuts.py`)

Nut advantage here is who has the bigger share of hands with 90% equity or more. 5,081 decisions (not facing a bet) on 132 flops, ranges as the action leaves them. Names the right player when the gap is 1 to 3 points / 3 to 8 / over 8:

| Who has more... | Flop | Turn | River |
|---|---|---|---|
| sets and better (sets, straights, flushes, full houses) | **81 / 86 / 92%** | 62 / 79 / 87% | 57 / 63 / 81% |
| two pair or better | 77 / 87 / 92% | 59 / 76 / 84% | 54 / 60 / 81% |
| overpair or better | 56 / 70 / 76% | 52 / 65 / 69% | 54 / 61 / 76% |
| top pair or better | 66 / 70 / 76% | 55 / 54 / 63% | 46 / 53 / 67% |
| the best kind of hand around (held by 3%+ of the two ranges), or better | 71 / 81 / 86% | **68 / 83 / 89%** | **64 / 70 / 87%** |

- On the flop: **who has more sets and two pair**. Top pair, the count for range advantage, is the wrong one for the nuts (76% at best).
- On the turn and river the bar moves with the board: find the best kind of hand that is actually held in some number (a flush on a flush board, a straight, a full house on a paired one) and count who has more of that or better.
- It is a weaker rule than the one for range advantage: 86 to 92% when the gap is big, 62 to 81% when it is small.
