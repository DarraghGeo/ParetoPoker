# Bucketing for the restricted solve

One player (the restricted player) plays by shared tables; the other is unrestricted. A table maps a **cell** to one mixed
answer. Every hand of the restricted player that falls in the same cell of the same table plays that answer, on every
flop, runout and line.

## Tables

One table per seat, pot type, street and situation.

| Key | Values |
|---|---|
| Seat | out of position, in position |
| Pot type | single-raised if stacks behind / pot > 8 as the flop starts, else 3-bet |
| Street | flop, turn, river |
| Situation | first to act (nothing to call, including after a check); facing a bet (one table per bet size if several); facing a raise (one table per raise level if several) |

## Cell

A cell is the triple (place, against his best, depth). 6 x 3 x 3 = 54 cells a table.

### 1. Place in own range: 6 bands

Computed per decision node and per board (flop; flop + turn card; flop + turn + river card).

- `E[h]`: the hand's equity on the current board against the other player's range **as the flop started** (his starting
  weights, hands blocked by the board or by `h` removed), all remaining cards dealt.
- `W[h]`: the hand's starting weight x the restricted player's own probability of reaching this node with `h` under the
  current tables x 1 if `h` is not blocked by the board, else 0.
- Sort hands by `E` ascending. `place[h] = (sum of W over hands sorted before h + W[h] / 2) / sum of W`.
- Bands by `place`: `[0, .15)`, `[.15, .35)`, `[.35, .55)`, `[.55, .75)`, `[.75, .9)`, `[.9, 1]`.

`W` uses the restricted player's own reach, so cell membership changes as the tables change: recompute it every
iteration. The other player's range is never updated for `E`.

### 2. Equity against his strongest third: 3 bands

Computed per board.

- Take the other player's starting range on the current board (blocked hands removed).
- Rank his hands by their equity against the restricted player's starting range, descending.
- Keep whole hands while the cumulative weight is <= 1/3 of his total weight.
- `T[h]`: the restricted player's hand's equity against that subset (card removal applied), remaining cards dealt.
- Bands by `T`: `[0, .15)`, `[.15, .4)`, `[.4, 1]`.

### 3. Stack depth: 3 bands

Computed per decision node.

- `depth = (stack behind at the flop - the larger amount either player has put in since the flop) / (pot at the flop + both amounts put in since the flop)`.
- Bands: `[0, 1.5)`, `[1.5, 4)`, `[4, inf)`.

## Tying the strategy

- Cell regret for an action = sum, over every (flop, runout, node, hand) in the cell, of the hand's counterfactual regret
  for that action x the hand's starting weight x the chance probability of the runout.
- One regret-matching+ update per cell per iteration; the resulting answer is applied to every hand in the cell.
- Average strategy per cell weighted by iteration number x the restricted player's own reach mass in the cell.
- If an action of the table is not available at a node (for example no raise because the bet is all-in), its share goes
  to the last available action.
- The unrestricted player plays a best response to the current tables each iteration (per hand, per node, no buckets).
- Exploitability of a set of tables = the unrestricted player's best-response value against them - his value when both
  players are unrestricted.

## What was measured

Exploitability in percent of the pot. River: full game. Turn and flop: one bet size and one raise a street; flop on
sampled runouts.

| Choice | Result |
|---|---|
| Place in own range, in place of raw equity bands | river 6.5-7.0 -> 4.4 |
| Place read from the range held at the node, in place of the starting range | turn 11.6 / 14.1 -> 10.1 / 8.9 |
| Against his strongest third, in place of own share of weak hands | turn 10.5 / 8.5 -> 9.6 / 8.8; one deep spot alone 6.9 / 7.2 -> 6.1 / 4.9 |
| Separate tables by pot type | flop 11.8 / 9.2 -> 10.9 / 8.5 |
| Stack depth | turn: within half a point either way; not tested with pot type present |

No gain when added to the above:

| Bucket | Tested on |
|---|---|
| Blockers | river |
| Draw or not; three kinds of draw; draw only when facing a bet | turn, flop |
| Showdown value now x draw equity (equity - showdown value) | turn, one spot |
| Spread of equity over the next card; E[HS^2]; flat / tilted up / tilted down | turn, flop |
| Share of strong hands against his (nut advantage), first to act | turn |
| Range equity in three bands, first to act | flop |
| 20 place bands in place of 6 | turn |
| Equity against the range the other player holds at the node, in place of his starting range | turn |

The flop tests of draw-related buckets used 4 sampled turn cards and are weak evidence.
