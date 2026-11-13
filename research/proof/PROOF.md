# What is proven about the explanations

This file is written by `research/proof/report.mjs` from the result files in `research/proof/out/`.
Every figure below is one a script produced; none is typed in.

## The standard

An explanation is made of two sorts of statement, and each is held to its own standard.

**A number** is a fact of the solution on screen: how often he folds in it, the hand's equity against the
range he arrives with in it, what an action is worth against his strategy in it. A number is *exact*: it is
arithmetic on the strategies shown, and the arithmetic is checked three independent ways (proofs 1 to 5).
It is worded as being about this solution ("in this solution", "against his strategy here"). Another
equally good solution of the same spot can have a different number, and where that was measured it is
reported, not hidden.

**A conclusion** is drawn from numbers and is meant to be true of the spot, not of one solve: "this action
is worse", "these two are worth the same", "this bet earns through his folds", "this call is for the cards
that improve it". A conclusion is made only where it clears a gate, and the gates are kept only if, on spots
never used to set them, **every** conclusion made at the accuracy the page solves to is also true of the same
hand in two far finer solves by two different algorithms (proof 6). One false conclusion fails the set.

Anything that did not meet its standard is not said, and is listed under "Not proven" at the end.

## Proof 1. The accounting adds up, and agrees with an evaluator that shares nothing with the solver's

`identities.mjs`. For every hand at every decision looked at: (a) each action's value equals the value from
`independent.mjs`, which reads only the strategies, the tree and the cards and plays every line out to its
end; (b) the splits by his reply, by his holding and by the next card each add back to the action's value;
(c) folding is worth exactly minus what has been put in. Largest error found, in % of the starting pot:

| Spot | Decisions | Hands | Checks | Independent play-outs | Largest error (any check) |
|---|---|---|---|---|---|
| turn two-tone wide | 137 | 25,205 | 112,403 | 160 | 7.7e-13 |
| turn rainbow BB v BTN | 66 | 20,079 | 77,091 | 140 | 4.3e-13 |
| turn flush board | 110 | 30,674 | 141,810 | 160 | 5.7e-13 |
| turn paired | 62 | 17,928 | 64,525 | 140 | 6.0e-13 |
| turn tight ranges deep | 53 | 2,271 | 11,522 | 195 | 5.1e-13 |
| turn two flush draws | 46 | 9,673 | 35,403 | 140 | 3.4e-13 |
| flop two-tone | 109 | 22,053 | 88,628 | 168 | 7.7e-13 |
| flop rainbow dry | 131 | 39,080 | 155,733 | 168 | 5.7e-13 |
| flop monotone tight | 56 | 2,660 | 10,885 | 163 | 2.8e-13 |
| flop paired | 114 | 34,574 | 139,452 | 168 | 6.7e-13 |

Mirrored runouts (one stored board standing for several) are in play on the two-tone, monotone and paired
boards, so the mapping of hands onto stored boards is covered by the same checks.

## Proof 2. The words for a hand are right

`features.mjs`. Pair names and draws are checked against named examples and against a count done a second
way (by suit and rank patterns) over every hand on random flops and turns.
Examples: 25. Hands checked: 460,800. Failures: **0**.

Outs are counted by trying every card left in the deck: a card is an out when the evaluator says the hand has
become a flush or a straight it did not have, and the board alone has not.

## Proof 3. What an action a hand does not take is "worth" needed fixing

The solver's own value for an action assumes the hand then follows its solved strategy. For an action the
hand never takes, that later strategy was never trained. Measured on six turn spots, two solves each within
0.01% of the pot of perfect disagreed about such values by up to 33% of the pot on the main line.
`best.js` values an action by taking it and then playing the best reply to his solved strategy. Checked
(`best.mjs`): with the hand following its solved strategy instead, the walk reproduces the solver's values;
with the best reply it is never worth less; and at the first decision it equals the solver's own
best-response traversal, the one its exploitability is computed from.

| Spot | Decisions | Values compared | Largest difference from the solver, same strategy | Best reply ever worth less | Largest difference from the solver's best response at the root |
|---|---|---|---|---|---|
| turn two-tone wide | 24 | 12,708 | 4.8e-13 | 4.8e-13 | 3.6e-14 |
| turn rainbow BB v BTN | 22 | 15,852 | 3.0e-13 | 2.8e-13 | 5.7e-14 |
| turn flush board | 24 | 18,923 | 4.8e-13 | 3.1e-13 | 5.7e-14 |
| turn paired | 22 | 14,643 | 6.0e-13 | 6.0e-13 | 5.7e-14 |
| turn tight ranges deep | 23 | 3,565 | 4.5e-13 | 3.4e-13 | 4.3e-14 |
| turn two flush draws | 22 | 10,683 | 4.5e-13 | 3.1e-13 | 4.0e-14 |
| flop two-tone | 13 | 5,753 | 2.3e-13 | 2.3e-13 | 4.3e-14 |
| flop rainbow dry | 13 | 8,841 | 3.1e-13 | 2.2e-13 | 5.7e-14 |
| flop monotone tight | 13 | 1,320 | 1.1e-13 | 1.1e-13 | 4.3e-14 |
| flop paired | 13 | 8,849 | 4.1e-13 | 4.1e-13 | 8.5e-14 |

(% of the starting pot. "Ever worth less" is the largest amount by which a best reply fell short: rounding only.)
On the newer solver version the root vector is laid out differently on boards with a symmetry of their own, so
there the comparison is made on the whole game instead: both players' best-reply values, averaged, must be the
solver's own exploitability (see "Run again" below).
This also corrected the river, where "the next best play loses X" had been using the untrained values.

## Proof 4. Every conclusion made at page accuracy is true in two far finer solves

`accept.mjs`. A spot is solved as the page solves it. Every claim the explainer makes about every hand, at
every decision it explains, is tested against the same hand measured in two reference solves (discounted
CFR and CFR+).

How the rules came to be what they are, since that decides which sets count as a test:

1. Tolerances were measured on the calibration sets. The first held-out turn set then failed (106 of 22,036
   claims): claims that an unused action costs "about x" and next-card splits for hands that never call.
   Those were restated (costs as a direction; value claims only about actions the hand takes).
2. The second held-out turn set failed at one decision on a thin line (he had just shoved with a fifth of
   his range, and the references disagreed about how often he shoves). Conclusions were restricted to lines
   at least half of each range takes.
3. Forty random river spots then showed that the cost of an unused action and equity after his action are
   not fixed by the equilibrium (findings 2 and 4 below). Numbers and conclusions were separated, and each
   conclusion's truth test made its direction.
4. With the rules fixed as they stand, **fresh random sets were drawn and run once**: these are the test.
   The earlier sets were then run again under the final rules and are shown for completeness; the rules
   were shaped on them.

Lines at least half of each range takes:

| Street | Set of spots | Page vs reference accuracy | Conclusions | False | worse (made / false) | same | needs | builds | cards | Numbers | Outside tolerance | Largest reversed gap (% pot) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Turn | calibration (6 hand-built) | 0.02% vs 0.01% | 4,212 | **0** | 1,225 / 0 | 1,262 / 0 | 1,184 / 0 | 365 / 0 | 176 / 0 | 6,697 | 0 | 0.08 |
| Turn | held-out 1 (6 hand-built) | 0.02% vs 0.01% | 4,531 | **0** | 1,559 / 0 | 1,191 / 0 | 1,179 / 0 | 313 / 0 | 289 / 0 | 7,091 | 0 | 0.073 |
| Turn | held-out 2 (6 hand-built) | 0.02% vs 0.01% | 4,618 | **0** | 1,198 / 0 | 1,550 / 0 | 1,268 / 0 | 292 / 0 | 310 / 0 | 7,573 | 0 | 0.131 |
| Turn | fresh random (60) | 0.02% vs 0.01% | 30,220 | **0** | 9,133 / 0 | 8,781 / 0 | 7,788 / 0 | 2,005 / 0 | 2,513 / 0 | 46,750 | 0 | — |
| River | calibration (6 hand-built) | 0.01% vs 0.002% | 4,913 | **0** | 2,713 / 0 | 910 / 0 | 891 / 0 | 399 / 0 | — | 8,148 | 0 | 0.171 |
| River | held-out (6 hand-built) | 0.01% vs 0.002% | 4,131 | **0** | 2,260 / 0 | 802 / 0 | 787 / 0 | 282 / 0 | — | 7,437 | 0 | 0.192 |
| River | random (40) | 0.01% vs 0.002% | 20,109 | **0** | 4,393 / 0 | 9,068 / 0 | 4,915 / 0 | 1,733 / 0 | — | 33,527 | 152 | 0.249 |
| River | fresh random (60) | 0.01% vs 0.002% | 28,250 | **0** | 16,064 / 0 | 5,299 / 0 | 4,821 / 0 | 2,066 / 0 | — | 48,496 | 19 | 0.504 |

All sets together on those lines: **100,984 conclusions, 0 false.**
"Largest reversed gap" is the largest difference in worth, at page accuracy, whose direction a reference
reversed: the gate for calling an action worse is 2% of the pot on these lines, several times that figure.

What the conclusions are:

| Conclusion | Made when | True of a reference when |
|---|---|---|
| worse | an action the range uses, which this hand does not take, is worth at least the gate less than its best action | it is worth less there too |
| same | two actions the hand takes differ by no more than half the gap tolerance | they differ by no more than that plus the tolerance |
| needs | the times he continues against a bet the hand makes are worth less than the passive action is overall, by at least twice the tolerance | they are worth less there too |
| builds | they are worth more, by at least twice the tolerance | they are worth more there too |
| cards | a call the hand makes gains or loses, against folding, at least twice the tolerance on the cards that lift the hand (or on the others) | it has the same direction there |

### Thinner lines: a fifth to a half of each range

The same conclusions with wider gates (an unused action must be 4% of the pot worse before it is called
worse). These gates were fixed before the fresh random sets were drawn. The page uses 5% on rivers, for
margin: that makes fewer claims, every one of them among those tested here.

| Street | Set of spots | Page vs reference accuracy | Conclusions | False | worse (made / false) | same | needs | builds | cards | Numbers | Outside tolerance | Largest reversed gap (% pot) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Turn | calibration (6 hand-built) | 0.02% vs 0.01% | 3,489 | **0** | 1,939 / 0 | 347 / 0 | 339 / 0 | 42 / 0 | 822 / 0 | 3,316 | 0 | 0.072 |
| Turn | held-out 1 (6 hand-built) | 0.02% vs 0.01% | 3,215 | **0** | 1,542 / 0 | 356 / 0 | 385 / 0 | 78 / 0 | 854 / 0 | 3,266 | 0 | 0.19 |
| Turn | held-out 2 (6 hand-built) | 0.02% vs 0.01% | 4,467 | **0** | 2,052 / 0 | 606 / 0 | 697 / 0 | 106 / 0 | 1,006 / 0 | 4,563 | 0 | 0.195 |
| Turn | fresh random (60) | 0.02% vs 0.01% | 31,076 | **0** | 14,344 / 0 | 4,296 / 0 | 3,623 / 0 | 616 / 0 | 8,197 / 0 | 33,679 | 2 | — |
| River | calibration (6 hand-built) | 0.01% vs 0.002% | 4,803 | **0** | 3,251 / 0 | 846 / 0 | 431 / 0 | 275 / 0 | — | 6,811 | 0 | 1.134 |
| River | held-out (6 hand-built) | 0.01% vs 0.002% | 3,634 | **0** | 2,550 / 0 | 635 / 0 | 257 / 0 | 192 / 0 | — | 4,906 | 45 | 0.733 |
| River | random (40) | 0.01% vs 0.002% | 16,346 | **0** | 5,353 / 0 | 7,402 / 0 | 2,601 / 0 | 990 / 0 | — | 25,443 | 14 | 0.4 |
| River | fresh random (60) | 0.01% vs 0.002% | 25,373 | **0** | 17,271 / 0 | 4,600 / 0 | 2,396 / 0 | 1,106 / 0 | — | 35,431 | 16 | 2.291 |

All sets on those lines: **92,403 conclusions, 0 false.** The decision that broke the earlier wording (step 2 above) is in "held-out 2" and passes
under the final rules. Below a fifth of either range nothing is concluded.

### Both together

Turn and river, every set: **193,387 conclusions on 190 spots (85,828 turn, 107,559 river), 0 false.** Of these, 114,919 are on the 120 fresh random spots that the final rules had never seen.

**Control.** A test that never fails proves nothing unless it can fail. Run again on the held-out turn set with every conclusion turned into its opposite ("worse" with the two actions swapped, "needs" for "builds", the next-card directions reversed, "same" required to be false), the harness rejected **7,746 of 7,746**.

What "none false" can and cannot mean: conclusions about the same decision stand or fall together, so the
evidence is closer to "no false conclusion at any of the decisions explained on 190 spots" than to that many
independent trials. It is strong evidence, not a theorem. For "worse" there is also a reason it should
hold: a strategy that is a best reply to one equilibrium is a best reply to all of them.

### River decisions reached inside a turn spot

A spot that starts on the turn is solved to 0.02% as a whole; the river decisions after a card has come are
deeper and were tried apart, with gates fixed beforehand (an unused action 5% of the pot worse; lines at
least half of each range takes), on 30 of the fresh random turn spots, three river cards each:
**9,807 conclusions, 0 false** (44 decisions; largest reversed gap 0.731% of the pot).

### Flop spots, at the accuracy a browser reaches

A flop cannot be solved in a browser tab much finer than 0.3% of the pot, so that is the page accuracy
tested, against references at 0.02%. Flop decisions, and turn decisions after a card has come, on lines at
least half of each range takes. Gates were fixed beforehand from one flop spot measured in full. Part-way
through, after a finer solve had reversed a difference of 2.1% of the pot, the gate for calling an action
worse was raised from 3% to 5%; the "final gates" set was run after that.

| Street | Set of spots | Page vs reference accuracy | Conclusions | False | worse (made / false) | same | needs | builds | cards | Numbers | Outside tolerance | Largest reversed gap (% pot) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Flop | held-out (2 hand-built) | 0.3% vs 0.02% | 1,879 | **0** | 668 / 0 | 391 / 0 | 446 / 0 | 68 / 0 | 306 / 0 | 2,421 | 565 | 0.785 |
| Flop | fresh random, first gates (14) | 0.3% vs 0.02% | 9,725 | **1** | 3,016 / 0 | 2,591 / 1 | 2,396 / 0 | 631 / 0 | 1,091 / 0 | 16,317 | 167 | 2.798 |
| Flop | fresh random, final gates (8) | 0.3% vs 0.02% | 5,556 | **0** | 1,380 / 0 | 1,403 / 0 | 1,354 / 0 | 418 / 0 | 1,001 / 0 | 9,060 | 292 | 1.452 |

**17,160 conclusions on 24 spots, 1 false.**

**Not adopted.** same: 4,385 made, 1 false; needs: 4,196 made, 0 false; worse: 5,064 made, 0 false; builds: 1,117 made, 0 false; cards: 2,398 made, 0 false. The false one: a hand on a turn inside a flop spot that the 0.3% solve mixes between checking and betting ("worth the same to within 2.9% of the pot") where both finer solves have the bet 3.1% worse. One false conclusion is a failure, so the page draws no conclusions on flop spots: it gives the numbers and says they are only that. What would change this: flop solves finer than a browser tab manages, or gates widened and tested on spots not yet seen.

The numbers are another matter at this accuracy: 1,024 of 27,798
equities and fold frequencies fell more than one or two points from a reference. They remain what they are
worded as, this solution's numbers, but a flop solved to 0.3% is a coarse solution.

### Run again on the solver version the page now uses

Most of the above was run on poker-flopsolve 0.4.1. The page has since moved to 0.5.0-beta.0, so the
fresh sets and the accounting proofs were run again on it:

| Check | Result |
|---|---|
| Fresh random river spots (60) | 51,717 conclusions, **0 false** |
| Fresh random turn spots (30) | 30,711 conclusions, **0 false** |
| Best reply: same values as the solver when the hand follows its strategy (6 turn spots) | largest difference 5.1e-13% of the pot |
| Best reply: both players' values for the whole game, averaged, against the solver's own exploitability | largest difference 2.5e-7 points of exploitability |
| Accounting identities and independent play-out (6 turn spots) | largest error 1.2e-12% of the pot |


## What the page says, and what each sentence rests on

| Sentence | Sort | Rests on |
|---|---|---|
| "You have top pair with a flush draw (9 outs)" | exact | proof 2 |
| "it has 47% equity against the range he has here" / "It beats 33% of the range he has here" | number | exact enumeration of every card to come against the range the solution has him arrive with |
| "He has bet 33 into 100, so a call has to win 20% of the time" | exact | arithmetic |
| "B33: he folds 27% of the time against this hand" | number | proofs 1 and 3 (his reply, with the cards the hand removes) |
| "When he calls you are ahead 81% of the time" (river) | number | read off the called bet's worth; checked against a direct count over his calling hands (test) |
| "The times he does not fold are worth less to you than checking is overall … the bet earns its keep through the times he folds" | conclusion (needs) | proof 4 |
| "Even the times he does not fold are worth more … the bet does not depend on his folding" | conclusion (builds) | proof 4 |
| "X and B33 earn the same with this hand, to within 1.1% of the pot" | conclusion (same) | proof 4 |
| "B75 is worse with this hand: against his strategy in this solution it gives up 4% of the pot" | conclusion (worse) + number | proof 4 for "worse"; the amount is this solution's (proof 3) |
| "on the 9 cards that improve the hand it gains 12% of the pot, on the other 37 it loses 6%. The call is for those cards." | conclusion (cards) + numbers | proof 4 for the directions; proofs 1 and 3 for the amounts |
| "In this solution B33 comes out 1.6% of the pot behind X: too close to call it worse" | number | proof 3; no conclusion is drawn |
| "Out of position has more equity, by 6 points" (the spot sentence) | exact | poker-rangeman's figure, equal to an exact count on 28 spots (largest difference 0 points; `profile.mjs`) |

## What was found on the way

1. **The solver's value for an action a hand never takes is not what that action is worth.** It assumes the
   hand's own untrained later play (proof 3). Anything that quotes "this would lose X" from those values is
   unreliable. The page now values every action with the best reply afterwards.
2. **Even valued properly, what an unused action costs is not fixed by the equilibrium.** Two river solves,
   each within 0.002% of the pot of perfect, put the same deviation at 12.4% and at 5.9% of the pot. Only
   the direction carries over, which is what theory says: a strategy that is a best reply to one
   equilibrium is a best reply to every other, so an action it rejects is never better, but nothing fixes
   how much worse it is. Hence "worse" is a conclusion and the amount is a number of this solution.
3. **How often an individual hand takes each action is not fixed either.** On the main lines of the six turn
   spots the two references differ about a single hand's frequency by up to 51.3 points
   (99th percentile 6.1). No sentence rests on a hand's own frequency beyond whether
   it takes an action at all (10% of the time or more).
4. **Which hands he holds after his own action is not fixed.** On a river line that 73% of his range takes,
   the two references differed by four points about the equity of hands against that range. Equity after
   his action is therefore a number of this solution: across every set, on lines at least half of each range
   takes, 661 of 88,287 equities fell outside the tolerance (1 to 2 points) of a reference.

## Not proven: said nowhere on the page, to be proved later or dropped

| Claim | Why it is not made | Evidence |
|---|---|---|
| "Betting gains against his draws and loses to his strong hands": an action's gain split by what he holds | Not fixed by the equilibrium: which of his hands call is arbitrary among those indifferent | Two references (0.01%), main lines of six turn spots, 19,688 comparisons: the parts differ by up to **27.86% of the pot** (99th percentile 5.95%). `holding.mjs` |
| What an unused action costs, as a truth of the spot | Finding 2 | `accept.mjs`, random river set |
| Why a hand bets 60% and not 40% | Finding 3 | `tolerance.mjs` |
| Conclusions on lines less than a fifth of either range takes | Not tried. At one decision near that edge the two references disagreed about how often he takes the action at all (12.5% against 20%) | proof 4, step 2 |
| River decisions after a deal on lines under half of either range; anything two deals deep (a river inside a flop spot) | Not tried | — |
| Conclusions about flop decisions, and about turn decisions inside a flop spot | Tested at the accuracy a browser reaches (0.3%): a false conclusion was found, so none are drawn. Numbers only on flop spots | "Flop spots" above |
| "In position holds more of the strongest hands", "its range is condensed", "it is capped" | poker-rangeman's own measures and labels; their definitions were not checked here, so they are off the page for now | — |
| Blockers: "your cards remove his calls" as the reason for a play | Never put to the test: needs a conclusion with a truth test and gates of its own | — |
| Which of his hands fold, call or raise, by made hand | Not measured; the split by holding above suggests it will not be stable | — |
| Why one bet size and not another when the range uses both | The "same" and "worse" conclusions cover the hand's own actions; no claim about sizes as such has a test | — |
| What a check-behind is worth by the card that comes | The call-against-fold split is tested; a check has no fold to be set against | — |
| Comparisons between hands ("this one bets because it is weaker than that one") | No test | — |

## The river audit

Before this work the page worded river decisions from `river.js`. Each of its sentences, written at page
accuracy, was compared with what it writes about the same hand in two finer solves (`river-audit.mjs`, six
river spots, main lines): is the sentence there at all, and how far apart are the numbers in it?

| Sentence | Written | Absent or reshaped in a finer solve | Largest difference in a number (99th pct / max) |
|---|---|---|---|
| arbitrary | 123 | 31.3% | 46 / 56 |
| block | 62 | 14.5% | 14 / 14 |
| blockers | 84 | 15.5% | 44 / 48 |
| bluff | 470 | 22.8% | 17 / 25 |
| cost | 1,735 | 6.8% | 2 / 2 |
| defence | 78 | 22.4% | 31 / 32 |
| give-up | 472 | 1.6% | 20 / 20 |
| line | 160 | 30.0% | 10 / 10 |
| mix | 53 | 23.6% | 54 / 54 |
| no-raise | 1 | 0.0% | 0 / 0 |
| price | 114 | 5.3% | 2 / 2 |
| quota | 282 | 19.5% | 14 / 18 |
| raise | 67 | 2.2% | 1 / 1 |
| showdown | 815 | 6.0% | 3 / 4 |
| size | 485 | 8.1% | 2 / 2 |
| trap | 401 | 17.2% | 35 / 59 |
| value | 911 | 8.2% | 5 / 14 |

Many did not hold up, so the page no longer uses that wording. Rivers are now worded from the same proven
claims as turns (solved to 0.01%), with the price of a call and how often the hand is ahead when called
as numbers.

## Running it again

```
node research/proof/identities.mjs  > research/proof/out/identities.jsonl     # proof 1
node research/proof/features.mjs    > research/proof/out/features.json        # proof 2
node research/proof/best.mjs        > research/proof/out/best.jsonl           # proof 3
node research/proof/accept.mjs "held turn" 0.02    > research/proof/out/accept-held-turn-0.02.json   # proof 4, one set
node research/proof/accept.mjs "fresh river" 0.01 0.002 > research/proof/out/accept-fresh-river-0.01.json
node research/proof/holding.mjs     > research/proof/out/holding.json         # not proven: the evidence
node research/proof/river-audit.mjs > research/proof/out/river-audit.txt
node research/proof/report.mjs                                                # this file
```

The fast versions of proofs 1 to 3 and of the claims' truth tests also run with `npm test` (`test/street.test.js`).
