# The rules, street by street and seat by seat

`collect.mjs` records, at every decision, what each action is worth for each kind of hand (cells by ladder level, equity, how much of his range the hand beats now, and its draw). About 60 flops, 160 turns from the start of the turn, 16 flops for turns that follow flop action, and several thousand rivers. `bet2.py`, `param.py`, `face.py`, `flop.py` find thresholds from it (first order: the solution played afterwards); `est.py` fits equity from what the chart shows. The rules were then played over full hands in `research/ladder/play.mjs` (`ARMS=final`).

## The rules

Every threshold is on the hand's equity against his range as it stands. The price is bet / (pot + 2 x bet). "Ahead" is a share of top pair or better at least 4 points above his. His strong hands have 80% or more against your range, his weak ones under 30%.

| Decision | Flop | Turn | River |
|---|---|---|---|
| Bet, in position | everything, a third of the pot | a third, with 50%+ or a draw | three quarters, with 80%+; bluff under (his weak share - 20) |
| Bet, out of position | ahead: a third with 70%+ or a draw; else check | as in position | check all if his strong share is 20%+; else as in position, bluffs under (his weak share - 25) |
| Facing a bet, in position | price + 5 | the price | the price; raise from 75% (80% against more than the pot) |
| Facing a bet, out of position | price + 15 | price + 10 (15 against more than half the pot) | as in position |
| Facing a raise | price + 5 | price + 5 | the price |

Value by size, where another size is used: 75% for a third of the pot, 80% for three quarters, 85% for one and a half pots.

Equity from the chart: on the river, the share of his range the hand beats. On the turn, 5 + 0.85 x that share, + 10 for a draw. On the flop, 10 + 0.7 x that share, + 17 for a draw, + 3 for a gutshot or overcards. Out by about 5 points on average.

## Played over the full hand (14 flops: 4 single-raised, 3 3-bet, 7 4-bet; a third of the pot on the flop, a third or three quarters on the turn, three quarters on the river; one raise)

| | Out of position | In position | Both |
|---|---|---|---|
| The rules with exact equities | 2.20 | 1.56 | **1.88** |
| The rules with equity read off the chart | 3.59 | 2.85 | **3.22** |
| The same, each reading up to 10 points off | 4.71 | 3.51 | 4.11 |
| The earlier chart method on the same spots | 4.11 | 4.39 | 4.25 |

- With exact equities: flop 0.25, turn 0.61, river 1.02. By pot type: single-raised 1.97, 3-bet 2.94, 4-bet 1.38 (chart reading: 3.59, 4.14, 2.62).
- Against a perfect answer the rules give up about 33% of the pot.
- How often they bet, flop / turn / river, against the solution: in position 100 / 73 / 53% against 77 / 68 / 61%; out of position 6 / 64 / 20% against 39 / 65 / 30%.
- Variants tried on 7 other flops (exact equities): a turn rule that bets out of position only when ahead 1.89, always 1.80, only when his strong share is under 20% 2.13; calling five points looser out of position on the turn 1.82.

## What the single decisions showed

- **Facing a bet before the river, the seat matters**: out of position the threshold is 10 to 15 points over the price, in position at the price (turn) or 5 over (flop).
- **Raising matters on the river only**: against a small river bet, never raising costs 1.7 to 2.9% of the pot at that decision; raising from 75% leaves 0.06 to 0.08. On the turn and flop raising added nothing.
- **Flop and turn bets are small and wide.** In position on the flop, betting everything for a third costs 0.06 to 0.19 against 1.1 to 1.5 for checking everything; three quarters of the pot is worse at every threshold. On turns that follow flop action, a third with 50%+ and draws costs 0.25 in position against 1.09 for checking.
- **Out of position, betting or checking is nearly a toss-up first order** on the flop and turn (0.11 to 0.5 either way), which is why the variants barely differ.
- **River value by size**: 75, 80, 85% for a third, three quarters, one and a half pots, in position. Bluffs gain where his weak share is over 35%.
- **Blockers when facing a river bet**: thresholds on the share of his range beaten, without card removal, cost about 0.3 more at that decision than on exact equity.

## Not done

Narrowing the ranges without a solved spot; bet sizes compared over the full hand; an opponent who adapts; the out-of-position flop, where the rules almost never bet and the solution bets 39%.
