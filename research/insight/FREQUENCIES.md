# Range frequencies: the base formula and what corrects it

How often a range bets, folds to a bet and raises a bet, from a formula rather than a solve. The base is the derived one from the earlier engine (`research/src/derived.js`) and is never refitted. Corrections are added from facts about the two ranges, chosen on one set of flops and tried once on flops never seen.

## Verdict

- **Folding to a bet: accurate.** 4 to 5 points off on every street on unseen flops, which is close to the solver's own noise (about 3).
- **Betting on the river in position: close with the base alone.** 7 points off. No correction improves it.
- **Betting elsewhere: not accurate.** 12 to 16 points off on unseen flops, down from 16 to 28 for the base alone. A flexible model on the same facts reaches 7 to 10, so the limit is the facts, not the fitting.
- **Betting on the river out of position: derived, 9.5 points off.** The six-indifference game below, with nothing fitted, beats the fitted corrections (11.8).
- **Raising a bet on the flop: rough.** 10 points off. It has no derived base.

## Data

126 flops on the realistic ranges, solved whole to 0.3%: 8,250 decisions with both ranges recorded hand by hand (each hand's weight and its equity against the other range). 111 flops to choose and fit on, 15 fresh flops (2,182 decisions) for the final test.

**How settled the target is.** Six spots solved to 0.3% and again to 0.03% by two algorithms: the flop bet frequency moves 1.4 points on average, the turn bet frequency 2.6, the fold frequency 2.8, the raise frequency 3.1. A formula cannot be expected to do better than that.

## The base

The von Neumann thresholds on the bettor's real equity curve, for a bet of `s` pots:

- he folds `c = (s + a) / (1 + s)`, where `a` is the equity of the best bluff;
- the thinnest value bet beats half of what calls: `b = (1 + c) / 2`;
- bluffs are `s / (1 + s)` of the value bets.

So the range bets `v × (1 + s/(1+s))`, with `v` the share of it above `b`, and the defender folds `c`.

**Two repairs to how it was computed, not to the formula.** It is now solved by how much of the range bets for value rather than by the equity level, so that many hands of one strength (the board playing, the same flush) are shared out; before, a lump of equal hands could all be counted as bluffs. With several sizes offered the smallest is used.

## How close each formula is

Mean miss in percentage points of frequency. "Chosen on" is with whole flops left out in turn; "unseen" is the 15 fresh flops.

| Decision | Base alone (unseen) | With corrections (chosen on) | With corrections (unseen) | Within 5 points (unseen) | Flexible model, same facts |
|---|---|---|---|---|---|
| Fold, flop | 12.2 | 4.1 | 5.4 | 56% | 3.4 |
| Fold, turn | 9.3 | 5.5 | 5.3 | 56% | 3.7 |
| Fold, river | 3.9 | 3.7 | 4.0 | 76% | 2.6 |
| Bet, river, in position after a check | 7.2 | 6.6 | 7.5 | 45% | 4.0 |
| Bet, river, out of position | 15.7 | 10.0 | 11.8 | 39% | 6.8 |
| Bet, turn, in position after a check | 19.9 | 11.3 | 12.7 | 30% | 7.3 |
| Bet, turn, out of position | 18.0 | 11.8 | 12.5 | 35% | 10.1 |
| Bet, flop, in position after a check | 19.8 (chosen on) | 8.8 | too few | | 9.5 |
| Bet, flop, out of position | 28.4 | 11.6 | 15.9 | 13% | 9.6 |
| Raise, flop | no base | 6.8 | 9.6 | 37% | |

## The corrections

Each is `frequency = expit(logit(base) + constant + Σ slope × factor)`. The slopes are in `out/freq-formulas.txt` and `out/freq-formulas.json`. What matters, in words:

**Folding to a bet**
- **Seat.** In position folds less than the base says, on every street.
- **The bettor's range advantage before he bet** (flop). The further ahead he was, the more the defender folds.
- **How much air the bettor holds** (flop). More air in his range goes with more folding than the base, not less.
- **The defender's share of strong hands** (turn). More of them, less folding.
- The river needs almost nothing: the base is already within 4 points.

**Betting**
- **Share of strong hands against his** ("strong advantage": hands with 65% equity or more, mine less his). The largest single factor on every street. Plain range advantage and nut advantage (80% or more) carry less once this is in.
- **How spread out his range is.** A polarised opponent range cuts betting sharply; a condensed one invites it.
- **Swing** (turn). The more the river card moves the range's hands, the more it bets. Drawn equity pulls the other way once swing is counted.
- **Stack depth** (flop, out of position). Deeper stacks, less betting.
- **What he does when checked to** (flop and turn, out of position; known only from the solve). The more he bets after a check, the less the range leads. It adds under one point of accuracy.
- How often he folds or raises in the solution adds nothing once the ranges are known.

**Where the base is structurally wrong**
- **Flop and turn bluffs.** Value bets are about as many as the base says (flop 20% against 20%, turn 19% against 18%). Bluffs are three times as many: 0.7 bluffs for every value bet against the 0.25 to 0.43 the price allows. Draws and thin protection bets are not in a one-street formula. On the river the ratio is right (0.40 against 0.42).
- **Out of position.** The base treats a check as a showdown. Out of position it is not, and the river base over-bets by 7 points there.
- **Value bets are not a threshold.** Only 45% to 54% of the hands that are ahead bet. Which strong hands check is the part no summary of the range recovers.

## What would get betting frequency accurate

- **Adding up hands.** A model of each hand's own chance of betting (its equity, its place in the range, its draws, the spot), summed over the range, reaches 9.4 on the flop and 8.1 on the turn on flops left out (`freq_hand.py`). Better than any summary, not a formula one can write down.
- **The level game.** `research/src/CurveGame.js` solves the one-street game on both real curves with the real bet menu in milliseconds. On the river that is nearly the solve itself. It has no shared order of hands on the flop and turn.
- **More flops.** Only 214 flop betting decisions were available to fit on; the flop numbers are the least certain here.

## Files

`collect.mjs` (solves and records), `rebuild.mjs` (his range at each decision of the first collection), `freq_lib.py` (the base and the factors), `freq_final.py` (choosing, fitting, the test), `freq_two.py` (value and bluffs fitted apart), `freq_hand.py` (hands added up), `noise.mjs` (how settled the target is).

## Two corrections derived instead of fitted

`derive.py`. Each follows from indifference alone and was tried against the solver with no number fitted.

### A. Out of position on the river: a check is not a showdown

The base gives the bettor's best bluff its showdown equity when it checks. Out of position the other player may bet after the check, so the game has six indifferences instead of three. With one bet size `s`, no raise, his range uniform on the scale "share of his range beaten" (which is what river equity is) and ours any curve:

- we bluff `s/(1+s)` of our value bets, with our weakest hands;
- he folds `(s + what our best bluff is worth checked) / (1 + s)`;
- after our check he bets for value from `b2` and bluffs `s/(1+s)` of that;
- our checking range folds `(s + what his best bluff wins checked back) / (1 + s)`;
- `b2` beats half of what we check and call with;
- our thinnest value bet is worth the same bet and checked (checked, it calls his bet or wins the showdown he allows).

Everything follows from one unknown, how much of our range bets for value, found by a search.

| River, out of position, first to act | Misses by | Tracks the solver (r) | Within 5 points | Within 10 |
|---|---|---|---|---|
| Base | 15.7 | 0.61 | | |
| Base with fitted corrections | 11.8 | | 39% | 64% |
| **Derived, nothing fitted** | **9.5** | **0.82** | **53%** | **72%** |

On the 493 unseen decisions. On all 1,536 it is 9.4. The same solution also gives, untuned, how often he folds to our bet (4.8 points off) and how often he bets after our check (9.3 off).

It still bets about 4 points too often on average. What it leaves out: his bet after our check may be a different size, hands that block, and the lead by the turn caller (the solver leads 13% there; the base says 26%).

### B. Bluffs with streets to come: right on average, not spot by spot

On the river a bluff-catcher is indifferent when bluffs are `r = s/(1+s)` of the value bets. A street earlier, calling wins only against the hands that then give up, because the ones that bet again leave it indifferent again. So what gives up is `r` of what bets again, and with n bets to come the hands that are not value are `(1 + r1)(1 + r2)…(1 + rn) − 1` of the value bets, each `r` from that street's size as the stacks allow.

| | Solver: bets from hands behind for every bet from hands ahead | One street says | Streets to come say |
|---|---|---|---|
| Flop | 0.75 | 0.25 | 1.29 |
| Turn | 0.69 | 0.43 | 0.87 |
| River | 0.36 | 0.40 | 0.40 |

Put into the base it moves the average bet frequency to about the right place (flop out of position 35% against the solver's 37%, base 25%; turn in position 43% against 48%, base 36%). It does not improve the miss decision by decision (17 to 24 points, as before).

Why it overshoots: the derivation assumes value hands that stay value and a caller holding only bluff-catchers. It requires the bettor to fire again about 72% of the time after a call; the solver fires again 48% out of position and 59% in position. The caller's range holds hands that beat value bets, and equities move with the card.

So the direction and the size of the flop and turn bluff surplus are explained. Which spots bet more than others on those streets is not.

### C. What the caller's range does to the second bet

`derive2.py`. The streets-to-come ratio assumed a caller holding only bluff-catchers. He folds the bottom `c` of his range, so a hand that beat a share `x` of his whole range beats only `x' = (x − c)/(1 − c)` of what called. The thin value bets of this street are not value bets against that range, and check the next street.

Keeping the order of hands from turn to river (the river card left out):

- **River.** The bettor's range is his turn value hands at `x'` and his turn bluffs at the bottom. The base thresholds on that curve give how much of it bets for value. Call `phi` the share of the turn value bets that still do.
- **Turn.** The caller's weakest call beats only the bluffs that give up on the river and loses to everything else, the value bets that check the river included. Indifference gives
  `bluffs for every value bet on the turn = r_t + r_r × phi × (1 + r_t)`, with `r = s/(1+s)`.
  `phi = 1` is the streets-to-come ratio; `phi = 0` is the one-street ratio.
- The turn threshold and `phi` depend on each other, so the pair is solved as a fixed point.
- **Fires again** `= phi × (1 + r_r) / (1 + turn ratio)`.

Nothing fitted, 1,785 turn betting decisions:

| | Solver | One street | Bluff-catchers only | With the caller's range |
|---|---|---|---|---|
| Bluffs for every value bet, turn | 0.69 | 0.43 | 0.87 | **0.66** |
| Fires again on the river, out of position | 0.48 | | 0.70 | **0.43** |
| Fires again on the river, in position | 0.59 | | 0.70 | **0.41** |

The derived `phi` is 0.42: fewer than half of the turn value bets are still value bets against the range that called. That is the whole gap between 0.87 and 0.69.

**It explains the level, not the spots.** Decision by decision the turn bet frequency is no closer (18 to 20 points off, as the base), and the fire-again frequency is 19 to 20 off with a weak correlation (0.24 to 0.32). In position it fires again too rarely: the order of hands is not kept across the river card, and a bettor in position sees a check first.

### D. The ruler: what a hand beats now, not its equity

`derive3.py`. On the river equity is the share of his range beaten, and the thresholds are stated in that. On the turn and flop a draw has 30% equity and beats nothing yet. Putting the same untouched thresholds on the share of his range each hand beats now:

| Untuned base | Ruler: equity | Ruler: beats now |
|---|---|---|
| Turn, in position: misses by / tracks (r) | 18.9 / 0.16 | **14.2 / 0.42** |
| Turn, out of position | 18.5 / 0.29 | **16.9 / 0.54** |
| Turn, out of position, with the check game of A | 19.8 / 0.45 | **16.0 / 0.58** |
| Flop, in position | 18.7 / 0.26 | **12.6 / 0.47** |
| Flop, out of position | 22.6 / 0.65 | 23.1 / 0.63 |

On the 15 unseen flops the turn comes out the same (in position 20.6 to 15.0, out of position 18.0 to 15.8). The average bet frequency also lands near the solver's with no bluff correction at all (turn in position 49.5% against 47.3%).

This is the largest untuned gain on the earlier streets, and it is a change of input, not of formula. It is still 13 to 17 points off. Adding C on top of it bets too much (the draws are then counted twice: once as hands that beat little now, once as extra bluffs).

### Where the derivations stand

| | Derived, nothing fitted | Miss |
|---|---|---|
| Fold, river | base | 4 |
| Bet, river, in position | base | 7 |
| Bet, river, out of position | A | 9.5 |
| Bluff level, turn | C | average right (0.66 against 0.69) |
| Bet, turn | base on "beats now" (D), with A out of position | 14 to 16 |
| Bet, flop, in position | base on "beats now" (D) | 13 |
| Bet, flop, out of position | none that helps | 23 |

What is still missing on the earlier streets is the card to come: which hands change places, for the bettor and for the range that called.

### E. Multi-street equities in place of solving

`runouts.mjs` computes, with equities only, every turn hand's standing on every river card (the share of his range it beats there) for 2,076 turn decisions. Two ways of using that were tried, both untuned.

**As the ruler (`derive4.py`): no.** The base thresholds on one number made from a hand's spread of river standings:

| Ruler | Turn, in position: misses by / tracks | Turn, out of position (check game) |
|---|---|---|
| Equity (the average over rivers) | 19.6 / 0.16 | 20.6 / 0.39 |
| **What it beats now** | **14.2 / 0.42** | **17.1 / 0.53** |
| Median river standing | 15.4 / 0.32 | 17.0 / 0.52 |
| Low quarter | 21.6 / 0.10 | 21.3 / 0.36 |
| High quarter | 15.1 / 0.36 | 16.7 / 0.55 |
| Equivalent standing (the fixed standing worth as much as the spread, with a river bet to come) | 18.4 / 0.16 | 20.0 / 0.41 |

Nothing made from the runouts beats the turn standing itself. The spread of a hand over river cards is not what the value threshold is about.

**In the count of bluffs (`derive5.py`): right on average.** Before the river a called bluff still wins `q` of the time, so toward the caller's indifference it is worth `1 − q(1+2s)/(1+s)` of a bluff. The budget stays `s/(1+s)` for every value bet but is spent in those fractions, on the hands that gain most by betting over checking. `q` is the hand's equity against the range that calls.

| Turn | Solver: bets from hands behind | Derived bluffs | Solver: bets from hands ahead | Derived value |
|---|---|---|---|---|
| In position | 18.9% | 19.7% | 28.4% | 34.6% |
| Out of position | 13.0% | 14.8% | 18.4% | 24.7% |

The bluff side now comes out of the derivation at the right size, and the frequency tracks the solver a little better (0.42 to 0.47 in position, 0.58 to 0.60 out of position). The miss does not fall (15 to 17 points), because the error has moved to the other side: the formula bets a quarter more hands for value than the solver does, on the turn and far more on the flop (40% against 26%).

**What that leaves.** Every remaining point of error on the turn is on the value side: which of the hands that are ahead now check. Section C says why in the average (under half of the turn value bets are still value bets against the range that called), and the runout standings are the data needed to say it hand by hand: a turn value bet is a hand that is still ahead of his calling range on most rivers. That is the next derivation, and it uses only equities.

## The test that matters: playing the formulas

`play.mjs`. A whole strategy for both players is built from the derived formulas and nothing else: at every decision of a turn spot and all 48 of its rivers, how often to bet and with which hands, how often to fold and with which hands. It is written into the solver's own strategy store and the solver computes what it loses. The method is checked on every spot: the solver's own strategy, copied through the same path, scores exactly as the solve does.

**The strategy**
- **River, in position:** the base thresholds; value from the top, bluffs from the bottom.
- **River, out of position:** the check game of section A.
- **Turn:** value by what each hand beats now; bluffs counted by their equity when called (section E), the hands that gain most by betting first.
- **Facing a bet:** fold the share the bettor's own thresholds expect, the hands with the least equity.

**The spots.** 22 turn spots on 15 unseen flops, with the two ranges as the solver brought them to the turn (after the flop checked through, or after a flop bet and call). One bet size (75% of the pot) on each street and no raises.

**What it loses**, in % of the pot, one seat on the formulas and the other on the solver's equilibrium:

| Strategy | Gives up to the equilibrium player (mean / median / worst tenth) | A perfect best response wins |
|---|---|---|
| **Derived formulas** | **2.3 / 2.0 / 3.7** | 16.8 |
| Derived bets, folding by the price alone | 2.8 / 2.7 / 4.7 | 17.2 |
| The base as it stood before (one-street thresholds on equity everywhere) | 3.5 / 3.0 / 6.2 | 20.9 |

The derived strategy gives up less than the old base on 73% of the spots.

| By how the turn was reached | Out of position | In position | Stack to pot |
|---|---|---|---|
| Flop checked through | 2.4 | 3.2 | 6.5 |
| Flop bet out of position, called | 2.1 | 2.0 | 2.0 |
| Flop bet in position, called | 1.2 | 0.1 | 0.7 |

**Reading it**
- **Against a sound opponent it gives up about 2% of the pot a turn spot.** The work of sections A, D and E took a third off what the old base gave up (3.5 to 2.3).
- **Against a perfect exploiter it loses about 17%.** Any strategy of fixed thresholds does: the exploiter knows exactly which hands bet and which fold. This is the measure the frequency tables cannot give, and it says the formulas are a way to play well against good players, not an unexploitable strategy.
- **Depth is where it costs.** With little behind it is nearly free (0.1 to 1.2); with six and a half pots behind it gives up 2.4 to 3.2.

**What this does not cover.** Flops, raises, more than one bet size, and the hand-selection findings beyond what the formulas already order by (no blockers, no backdoor draws). 22 spots is few.

## The play test from the flop

`play-flop.mjs`, `formulas.mjs`. The same test over three streets: the formulas decide every action on the flop, every turn card and every river card; the solver scores the result. 29 random flops on the position ranges (11 4-bet, 10 3-bet, 6 single-raised, 2 squeeze pots), one bet size (75%) a street, no raises. On every spot the solver's own strategy copied through the same path scores as the solve does.

In % of the flop pot, one seat on the formulas and the other on the solver's equilibrium:

| Strategy | Gives up to the equilibrium player (mean / median / worst tenth) | A perfect best response wins |
|---|---|---|
| **Derived formulas** | **6.3 / 5.7 / 8.8** | 39 |
| The base as it stood before | 8.7 / 7.9 / 15.7 | 39 |

The derived strategy gives up less than the old base on 83% of the spots.

**Where it is given up.** The formulas on the flop alone (the solver playing the later streets), then on the flop and turn, then on all three; each step adds that street's share.

| | Flop | Turn | River | All |
|---|---|---|---|---|
| Out of position | 0.7 | 2.1 | 3.8 | 6.6 |
| In position | 0.6 | 2.1 | 3.3 | 6.0 |

| By pot type | Spots | Stack to pot | Derived | Old base |
|---|---|---|---|---|
| Single-raised | 6 | 17.5 | 6.7 | 8.4 |
| 3-bet | 10 | 4.2 | 6.1 | 10.2 |
| 4-bet | 11 | 1.5 | 6.1 | 6.7 |
| Squeeze | 2 | 3.0 | 6.9 | 13.1 |

**Reading it**
- **The flop decision itself is nearly free: 0.7% of the pot.** This is the street where the frequency formula was worst (13 to 23 points off). How often the range bets the flop hardly matters, as long as the later streets are played well. That is the point about heuristics, measured.
- **The loss is on the turn and the river, and it is too large.** 2% on the turn and 3.5% on the river, of the flop pot. They are larger pots, and by then the formulas are working from ranges their own earlier play built, while the opponent plays the equilibrium.
- **6% of the pot is not good enough.** A good player's heuristics give up something like 1 to 2%. The derived formulas took a quarter off the old base, which is progress in the right measure, but this is not yet a strategy to play.
- **The turn-only test (2.3% of the turn pot) was the kinder case**: it started from the solver's own turn ranges.

**What to look at next**, by what it costs:
1. **The river after betting has happened** (3.5%). The river formulas are derived for ranges as they stand; here the ranges are the product of two streets of formula play. Either the earlier streets leave the wrong hands in, or the river thresholds are being applied to ranges they do not fit. Splitting the river loss by line (after a check-through, after a bet and call) says which.
2. **The turn** (2.1%). The value side is known to overbet (section E).
3. **Hand selection.** Nothing here uses blockers or backdoor draws.

## Any bet sizes and any raises

`formulas.mjs` (`acting`, `facing`), `play-full.mjs`. One size and no raises is not poker, so the formulas were extended by the same indifference arguments and the test rerun on a tree with two bet sizes on every street (33% and 100% on the flop, 50% and 100% after), a raise to three times the bet, and all-in when most of the stack is in.

**Several bet sizes**
- One weakest bluff is indifferent between checking and every size, so he folds `c_i = (s_i + u)/(1 + s_i)` to size `i`, with `u` what that bluff is worth checked.
- A hand that beats `x` of his range earns `x(1 + 2 s_i) − s_i(1 + c_i)` betting size `i` for value. It takes the best of those and checking, so stronger hands make the bigger bets.
- Each size has `s_i/(1 + s_i)` bluffs for every value bet of that size.
- `u` is the one unknown, found by a search. Any number of sizes.

**Raises**
- A bluff raise risks what it puts in to win the pot, so the range that bet folds `f = add/(add + pot)` to it.
- His bluff-catcher calls the difference to win the pot and the raise, which fixes the bluff raises for every value raise.
- A value raise beats half of what calls it: `(1 + f)/2` of the range that bet.
- The hands that fold are still the share his bluffs need. Before the river the bluff raises are the hands with the most equity against his strong hands (the draws), each counted by that equity; on the river, the best of the hands that would fold.
- The same rule answers a re-raise, so it covers any raise size and any number of raises.

**What it loses**, in % of the flop pot, one seat on the formulas against the solver's equilibrium:

| Tree | Spots | Gives up (mean / median / worst tenth) | Flop / turn / river |
|---|---|---|---|
| One size, no raises (above) | 29 | 6.3 / 5.7 / 8.8 | 0.7 / 2.1 / 3.5 |
| **Two sizes and a raise** | 15 | **11.3 / 10.0 / 18.2** | 2.4 / 3.5 / 5.4 |

By pot type on the fuller tree: 4-bet pots 9.0 (9 spots), squeeze 11.4 (2), 3-bet 16.6 (4). The batch was stopped at 15 spots and has no single-raised pots.

**Do the new formulas help, or is the game just harder?** The same eight 4-bet-pot flops on the fuller tree, with parts of the formulas switched off:

| Formula strategy | Gives up |
|---|---|
| **Sizes and raises (the full formulas)** | **8.1** |
| Never raises | 9.6 |
| Bets one size only | 9.8 |
| One size and never raises | 10.5 |

Both extensions earn their place: sizing is worth about 1.7 points and raising about 1.5. The loss is larger than on the simple tree because the opponent now has raises and sizes to use against a strategy that is still rough, not because the new formulas are wrong.

**Where that leaves it.** In a tree that looks like poker the formulas give up 8 to 11% of the pot to an equilibrium opponent, and far more in 3-bet pots. That is a long way from good enough. The flop is no longer free (2.4%): facing a raise and choosing a size both cost there.

## Hand selection or amounts: which one costs

`play-full.mjs` with `VARIANT=oraclehands` and `VARIANT=oraclefreq`. The same eight 4-bet-pot flops on the tree with two sizes and a raise. At every decision the strategy is split in two: how much of the range takes each action, and which hands do. One part is taken from the formulas and the other from the solver.

| How much of the range takes each action | Which hands take it | Gives up (mean / median / worst tenth) | Flop / turn / river |
|---|---|---|---|
| Formulas | Formulas | 8.1 / 5.6 / 15.5 | 2.7 / 1.8 / 3.5 |
| Formulas | **Solver** | 6.3 / 5.3 / 8.9 | 2.9 / 1.5 / 1.9 |
| **Solver** | Formulas (their picks first, then by equity) | **2.0 / 1.9 / 3.3** | 0.5 / 0.6 / 0.9 |
| Solver | Solver | 0.1 | |

- **Hand selection is the small part.** Giving the formulas the solver's own choice of hands takes the loss from 8.1 to 6.3. That is the most any hand-selection rule could recover, blockers and backdoor draws included.
- **The amounts are the large part.** With the solver's amounts and nothing better than "strongest hands first, weakest hands fold", the strategy gives up 2.0% of the pot, on every street under 1%.
- **So ordering hands by strength and equity is already good enough.** What is not good enough is how much of the range bets, raises and folds at each decision.

This corrects the reading of the one-size test. There the flop looked free whatever the frequency; in a tree with raises and sizes, getting the amounts wrong is three quarters of the loss.

**How the solver's amounts are taken.** At each decision the solver's strategy is applied to the range the formula player actually has there, and added up action by action. It is the range-level frequency, not a hand-by-hand copy; the hands are then chosen by the formulas. The ranges differ from the solver's own by then, so both oracle rows are approximate.
