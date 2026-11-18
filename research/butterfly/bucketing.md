# Bucketing dimensions

A bucket is the combination of the seven dimensions below. All hands of the bucketed player in the same bucket share one
strategy.

## 1. Seat

Out of position, in position.

## 2. Pot type

Single-raised if stacks behind / pot > 8 as the flop starts, else 3-bet.

## 3. Street

Flop, turn, river.

## 4. Situation

- First to act: nothing to call, including after a check.
- Facing a bet: one value per bet size.
- Facing a raise: one value per raise level.

## 5. Place in own range: 6 bands

Per decision node and per board (flop; flop + turn card; flop + turn + river card).

- `E[h]`: the hand's equity on the current board against the other player's range as the flop started (his starting
  weights; hands blocked by the board or by `h` removed), all remaining cards dealt.
- `W[h]`: the hand's starting weight x the bucketed player's own probability of reaching this node with `h` x 1 if `h`
  is not blocked by the board, else 0.
- Sort hands by `E` ascending. `place[h] = (sum of W over hands sorted before h + W[h] / 2) / sum of W`.
- Bands by `place`: `[0, .15)`, `[.15, .35)`, `[.35, .55)`, `[.55, .75)`, `[.75, .9)`, `[.9, 1]`.

`W` depends on the bucketed player's current strategy, so a hand's band at a node changes when the strategy changes.

## 6. Equity against his strongest third: 3 bands

Per board.

- Take the other player's starting range on the current board (blocked hands removed).
- Rank his hands by their equity against the bucketed player's starting range, descending.
- Keep whole hands while the cumulative weight is <= 1/3 of his total weight.
- `T[h]`: the hand's equity against that subset (card removal applied), remaining cards dealt.
- Bands by `T`: `[0, .15)`, `[.15, .4)`, `[.4, 1]`.

## 7. Stack depth: 3 bands

Per decision node.

- `depth = (stack behind at the flop - the larger amount either player has put in since the flop) / (pot at the flop + both amounts put in since the flop)`.
- Bands: `[0, 1.5)`, `[1.5, 4)`, `[4, inf)`.
