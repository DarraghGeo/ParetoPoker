# The whole method, played from the flop

`play.mjs` plays one seat from the strength ladder alone over the flop, every turn and every river, the other seat on the solution, and scores what the seat gives up over the hand. The seat knows only what the chart shows: both ranges by level (its own as it has played, his as the solution plays), the range line (top pair or better), the value line (count down his side), the price line (count up his betting range), each bar's own line (strength now from top pair up, what is still to come below), the street and the seat. No equities, no solution. `report.py` prints the tables.

20 flop spots (5 single-raised, 5 3-bet, 7 4-bet, 3 squeezed), one bet size a street (a third of the pot on the flop, three quarters after), one raise.

**The rules played.** Betting: value is what lies above the value line; the bottom is draws and trash; the rest is the middle. Each bets at the rate of experiment 12 of the charts study (by street, seat, range advantage, his strong hands): value from the top, the bottom from the draws down (the weakest first on the river), the middle by what is still to come (the strongest first on the river). Facing a bet: continue above the price line (eight points over it before the river), draws continue before the river, raise above 85% of his range on the river only.

| What the player holds | Gives up, % of the starting pot (out of position / in position / both) |
|---|---|
| The rule's number | 4.16 / 3.72 / **3.94** |
| The frequency as one of three words | 4.02 / 3.73 / 3.88 |
| The word, up to 20 points either way | 3.99 / 3.94 / 3.96 |
| The same, and the lines up to 10 points of his range off | 4.26 / 4.26 / 4.26 |

- **Words and their vagueness cost nothing measurable** (3.94, 3.88, 3.96). Misplacing the lines by up to 10 points adds 0.3.
- **Where it goes:** flop 0.74, turn 1.07, river 2.13.
- By pot type: single-raised 4.45, 3-bet 4.93, 4-bet 3.21, squeezed 3.32.
- The frequencies come out close on the turn and river (out of position 34% and 36% against the solution's 33% and 37%; in position 46% and 58% against 45% and 54%) and low on the flop (about 50% against 65%).
- **Against an opponent who answers perfectly it gives up about 32% of the pot**: the method is far from safe against someone who studies it.
- For scale: the earlier equity formulas of research/insight gave up about 6.2 over the same kind of hand, and a plain equity ruler 8.6.

Limits: one size a street; twenty spots; the opponent plays the solution; the chart's ranges for the player's own side are its own (wrong) ranges, as they would be for a player reading a chart of the solution only approximately.
