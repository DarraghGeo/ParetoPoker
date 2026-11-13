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
This also corrected the river, where "the next best play loses X" had been using the untrained values.

## Proof 4. Every conclusion made at page accuracy is true in two far finer solves

`accept.mjs`. A spot is solved as the page solves it. Every claim the explainer makes about every hand, at
every decision it explains, is tested against the same hand measured in two reference solves (discounted
CFR and CFR+). Gates were set on the calibration sets and then left alone; the held-out and random sets are
the test. Lines at least half of each range takes:

| Street | Set of spots | Page vs reference accuracy | Conclusions | False | worse (made / false) | same | needs | builds | cards | Numbers | Outside tolerance | Largest reversed gap (% pot) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Turn | calibration (6 hand-built) | 0.02% vs 0.01% | 3,950 | **0** | 963 / 0 | 1,262 / 0 | 1,184 / 0 | 365 / 0 | 176 / 0 | 6,697 | 0 | — |
| Turn | held-out 1 (6 hand-built) | 0.02% vs 0.01% | 4,235 | **0** | 1,263 / 0 | 1,191 / 0 | 1,179 / 0 | 313 / 0 | 289 / 0 | 7,091 | 0 | — |
| Turn | held-out 2 (6 hand-built) | 0.02% vs 0.01% | 4,433 | **0** | 997 / 0 | 1,550 / 0 | 1,268 / 0 | 292 / 0 | 326 / 0 | 7,573 | 0 | — |
| River | calibration (6 hand-built) | 0.01% vs 0.002% | 3,957 | **0** | 1,757 / 0 | 910 / 0 | 891 / 0 | 399 / 0 | — | 8,148 | 0 | — |
| River | held-out (6 hand-built) | 0.01% vs 0.002% | 3,125 | **0** | 1,254 / 0 | 802 / 0 | 787 / 0 | 282 / 0 | — | 7,437 | 0 | — |
| River | random (40) | 0.01% vs 0.002% | 19,164 | **0** | 3,448 / 0 | 9,068 / 0 | 4,915 / 0 | 1,733 / 0 | — | 33,527 | 152 | — |
| River | fresh random (60) | 0.01% vs 0.002% | 28,250 | **0** | 16,064 / 0 | 5,299 / 0 | 4,821 / 0 | 2,066 / 0 | — | 48,496 | 19 | 0.504 |

All sets together on those lines: **67,114 conclusions, 0 false.**
"Largest reversed gap" is the largest difference in worth, at page accuracy, whose direction a reference
reversed: the gate for calling an action worse is 2% of the pot on turns and rivers, several times that figure.

What the conclusions are:

| Conclusion | Made when | True of a reference when |
|---|---|---|
| worse | an action the range uses, which this hand does not take, is worth at least the gate less than its best action | it is worth less there too |
| same | two actions the hand takes differ by no more than half the gap tolerance | they differ by no more than that plus the tolerance |
| needs | the times he continues against a bet the hand makes are worth less than the passive action is overall, by at least twice the tolerance | they are worth less there too |
| builds | they are worth more, by at least twice the tolerance | they are worth more there too |
| cards | a call the hand makes gains or loses, against folding, at least twice the tolerance on the cards that lift the hand (or on the others) | it has the same direction there |

### On trial: thinner lines

The same conclusions on lines a fifth to a half of each range takes, with wider gates. Not in use on the page.

| Street | Set of spots | Page vs reference accuracy | Conclusions | False | worse (made / false) | same | needs | builds | cards | Numbers | Outside tolerance | Largest reversed gap (% pot) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| River | fresh random (60) | 0.01% vs 0.002% | 25,373 | **0** | 17,271 / 0 | 4,600 / 0 | 2,396 / 0 | 1,106 / 0 | — | 35,431 | 16 | 2.291 |

All sets: 25,373 conclusions, 0 false. See "Not proven" for why these are not yet adopted.

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
