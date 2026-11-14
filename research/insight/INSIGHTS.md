# Why this hand: ideas tested against the solver

A hunt for the reasons a player gives for a decision ("it has a backdoor flush draw", "it blocks his calls", "it has showdown value"), each one tested against solved spots on the realistic ranges.

## What was done

- **Spots.** 86 flops dealt at random, across 44 of the 47 range pairs by position (29 single-raised, 20 3-bet, 32 4-bet, 5 squeeze pots; limped pots were too large to solve). Each solved whole to 0.3% of the pot with three flop bet sizes (33%, 75%, 125%), one size on later streets and a raise.
- **Decisions.** 350 flop decisions (betting first, betting after a check, facing a bet) and 1,245 turn decisions (second barrel, delayed bet, probe) on three random turn cards a flop. 58,000 flop hands and 165,000 turn hands.
- **Each idea is one comparison.** Hands A against hands B inside the same decision, averaged over flops. Where it says "same equity", B is reweighted to A's equity in 5-point bins.
- **Twins.** The sharpest test: the same two ranks in the same decision, differing only in suit (K♥T♣ on a board with one heart against K♠T♣). Whatever differs, the suit is the reason.
- **Two halves.** An idea "holds" only if it has the same sign in both halves of the flops, each on its own, and t of 3 or more overall. "Reversed" means the opposite holds by the same rule.
- **Exceptions.** For every idea, the effect was set against the spot: position, who raised before the flop, stack depth, board texture, how often he folds and raises.

Numbers are percentage points of frequency unless said. "Worth" is what the hand wins on average in the solution, in pots; "more than its equity" is worth minus equity. Scripts and raw outputs are in this folder (`ideas.py`, `report.py`, `twins.py`, `spots.py`, `raised.py`, `out/*.txt`).

**These are patterns, not proofs.** Flop solves at 0.3% are accurate for groups of hands across many flops, not for one hand on one board. Nothing here has passed the proof standard in `research/proof/PROOF.md`.

## The five things worth knowing

1. **A backdoor flush draw is the main reason a marginal hand continues on the flop.** Against its twin without one, a pocket pair below top pair folds 37 points less, bottom pair 17, middle pair 15, an unpaired hand 18. The draw adds about 2.5 points of equity and decides the hand.
2. **A backdoor flush draw is worth two to three times its equity.** Top pair with one has 2.1 points more equity than its twin and wins 5.8% of the pot more. The same holds for overpairs (+5.7%), middle pair (+6.0%) and bottom pair (+5.2%). It does nothing for an underpair (+0.3%).
3. **Equity that cannot improve is worth much less than equity that can.** At the same equity, ace high wins 22% of the pot less than a draw, and a pocket pair under the board wins 7% less than a pair made with the board.
4. **On the turn, bluffs are chosen by draw first and blockers second.** A flush draw bets 49 to 75 points more than its twin without. Among hands with no draw, the ones whose cards make him fold more bet 16 to 24 points more at the same equity.
5. **Several things players say are backwards in the solver.** Two overcards bet less, not more. Open-enders raise more than gutshots. The nut flush draw bets more than low flush draws on the flop.

## The K♥T♣ example, tested

The idea: KTo bets because top pair has a redraw to two pair; K♥T♣ also has a backdoor flush, wants to see the turn, and so avoids getting raised.

| Part of the idea | What the solver does | Verdict |
|---|---|---|
| Top pair with more to gain on the turn bets more | +7 points at the same equity (t 3.4), only on boards below jack-high (+12; +1 on high boards) | Holds, modest |
| Top pair with a top kicker bets more | +14 on the flop, +22 to +31 on the turn | Holds |
| The backdoor makes top pair bet less often | +1 point against its twin (t 1.2) | No |
| The backdoor makes top pair bet smaller | Size moves 1.5% of the way from the biggest bet to the smallest (t −3.4, 67% of flops) | Real but tiny |
| The backdoor makes top pair raise less when bet into | −2 points (t −1.3). It calls 7 more and folds 5 less | No: it folds less, it does not raise less |
| The backdoor hand fears being raised | Raised after betting, it folds 2% against 4% without. Big bets are raised less often than small ones (13% against 17%), so avoiding raises would mean betting bigger, not smaller | No |
| "Wants to see the turn" shows up somewhere | Sets and two pair with a backdoor raise 6 points less and call 5 more (t −2.6). Overpairs with a nut backdoor size down (t −2.4) | Yes, but in the strong hands |

What the solver supports saying: **K♥T♣ is a sturdier hand than K♠T♣, not a more cautious one.** The backdoor draw makes it worth 6% of the pot more and lets it call bets and raises its twin sometimes folds to. It bets as often. The hands that slow down to see a turn with a backdoor draw are sets, two pair and big overpairs, which can afford to.

## Ideas that hold

### Flop: betting

| Idea | Effect | Where it changes |
|---|---|---|
| Top pair with a top kicker bets more than with a weak one | +14 (t 5.5) | Everywhere |
| Unpaired hands bet more when their cards make him fold more (same equity) | +20 (t 7.6) | Two-tone boards +25, others +8. 4-bet pots +7 |
| A gutshot bets more than a no-draw hand of the same equity | +17 (t 4.8) | Where he raises a lot +8, where he rarely does +25. Absent in 4-bet pots |
| The nut flush draw bets more than lower flush draws | +18 (t 6.7) | In position +27, out of position +4 |
| A pair with a draw bets more than the pair alone | +18 (t 3.9) | In position +34, out of position −1. As the raiser +27, as the caller −4 |
| Ace high checks more than lower unpaired hands | −8 (t −4.3) | In position −14, out of position +1 |
| A pocket pair under the board bets less than a pair made with the board (same equity) | −11 (t −4.5) | Not in 4-bet pots |
| A weak pair that loses more on bad turns bets more (same equity) | +5 (t 3.9) | Everywhere, small |
| Top set checks more than lower sets (leans: weaker in one half) | −9 (t −3.3) | Boards nine-high and up −14, low boards +2 |
| Top pair with more to gain on the turn bets more (same equity) | +7 (t 3.4) | Boards below jack-high +12 |

### Flop: facing a bet

| Idea | Effect on folding | Where it changes |
|---|---|---|
| A backdoor flush draw, against the twin without: pocket pair below top pair | −37 (t −8.9) | Not on paired boards |
| ... bottom pair | −17 (t −4.3) | |
| ... middle pair | −15 (t −4.4) | Against big bets −39, small bets −4 (everything calls a small bet) |
| ... underpair | −20 (t −4.3) | |
| ... unpaired | −18 (t −9.0); ace high −25, lower −16 | Low boards −30, high boards −9 |
| ... top pair, overpair | −5 each (t −3.9, −2.7) | |
| A gutshot folds less than a no-draw hand of the same equity | −64 (t −16.9) | Everywhere |
| A gutshot raises more than a no-draw hand of the same equity | +29 (t 8.4) | Where the range raises a lot +42, otherwise +14 |
| Two overcards fold less than one or none | −42 (t −15.2) | Everywhere |
| Ace high folds less than lower unpaired hands | −16 (t −8.0) | Paired boards −30, low boards −22 |
| A pocket pair under the board folds more than a pair made with the board (same equity) | +27 (t 7.7) | Not on connected boards (+5) |
| An unpaired hand with a backdoor flush draw raises more (same equity) | +6 (t 3.5) | |
| Unpaired, holding the ace or king of the board's two-flush suit raises more (same equity) | +23 (t 5.8) | Only where the range raises at all |

### Turn

| Idea | Second barrel | Delayed bet in position | Probe out of position |
|---|---|---|---|
| A flush draw bets, its twin without gives up | +48 | +49 | +75 |
| A gutshot bets more than a no-draw hand (same equity) | +20 | +26 | +42 |
| No-draw hands whose cards make him fold more bet more (same equity) | +24 | +23 | +16 |
| No-draw hands with the ace or king of the flush suit bet more (twin) | +8 (weak) | +30 | +23 |
| A weak pair with a draw bets more than the pair alone | +28 | +30 | +15 |
| Top pair with a top kicker bets more | +22 | +31 | +22 |
| Top pair with a flush draw bets more than its twin | +7 (no) | +36 | −4 (no) |
| Ace high bets less than lower no-draw hands | −1 (no) | −29 | −5 (weak) |
| The nut flush draw bets less than lower flush draws | +10 (opposite, weak) | −1 (no) | −15 |

All entries without a note hold in both halves, with t of 5 or more.

## Ideas that are wrong or backwards

| Idea | What the solver does |
|---|---|
| Two overcards make a good flop bet | They bet 10 points **less** than one or no overcard (t −4.1), and in position 22 less. They are the hands that call (fold 42 less). Overcards are showdown value and outs: a hand to continue with, not to bluff with |
| Weak draws make the bluff-raises; good draws just call | Open-enders raise 19 points **more** than gutshots (t −5.0), 26 more in deep single-raised pots. Flush draws raise 15 more than gutshots. Raises are 31% of flush draws and open-enders, 21% of gutshots, 7% of backdoor-only hands, 2.5% of hands with nothing |
| The nut flush draw prefers to check or call | On the flop it bets 18 points more than lower flush draws and raises no less. It checks more only when probing the turn out of position (−15) |
| A middle or bottom pair with an overcard kicker bets more | It bets 7 points **less** (t −3.0). The better kicker is more showdown value |
| A backdoor flush with both hole cards is better than with one | Facing a bet, the one-card version (two of the suit on the board) folds 15 points **less** (t −4.8). It also takes flush draws out of his range |
| Low overpairs bet and raise more for protection | +5 betting (t 1.4), −2 raising. Not shown |
| Exposed top pairs and overpairs raise for protection | 0 (t −0.2). Not shown |
| A nut backdoor flush is a better reason to continue than a low one | +4 (t 0.8). Not shown for unpaired hands. It matters for overpairs' sizing only |
| Backdoor straight draws work like backdoor flush draws | No effect found betting (−4) or facing a bet (+6), on about 20 flops. Open |
| The weakest air bluffs first on the flop | +3 (t 1.4). Not shown. On the flop, blockers choose the bluffs, not weakness |
| Flush draws bet more than open-enders | 0 |

## What turns an idea on and off

- **Position decides whether showdown value checks.** Ace high checks more only in position (−14 against +1). Two overcards bet less only in position. In position a check sees the next card free; out of position it does not.
- **Position decides whether a draw with a pair bets.** In position +34, out of position −1.
- **Draws avoid betting into raises; made hands do not.** A gutshot's extra betting falls from +25 to +8 where he raises often. Top pair with a backdoor shows no such pattern.
- **Blocker bluffs need a draw-heavy board.** The effect is three times larger on two-tone boards.
- **A small bet hides hand selection.** Against a 33% bet nearly every pair continues, so the backdoor matters only against the bigger bets.
- **Raises need depth.** Strong hands raise 64% of the time at deep stacks and 28% at shallow ones, 56% out of position and 28% in position, 52% on two-tone boards and 21% on monotone ones.
- **Bluff-raises live on low boards.** A no-draw unpaired hand raises 9% of the time on boards eight-high and under and 1% on boards jack-high and over. Never on monotone boards.
- **Who is ahead decides how much everything bets.** Two pair or better bets 69% where the range is ahead and 46% where it is behind; unpaired hands 53% against 21%.

## What an explanation could now say

These follow the measured patterns. The first three are hands from the collected solves; the last three illustrate a pattern and are not from a solve.

- **Q♦8♦ on K♠6♦8♠, facing a bet.** "This calls where Q♣8♣ folds. The only difference is the backdoor diamond draw. It adds one point of equity, but it gives the hand turn cards it can keep going on, and that is worth far more than the equity says."
- **8♣8♦ on 7♦K♦6♠, facing a bet.** "Eights with a diamond continue; eights without fold. A pocket pair under the king has two outs and most turns hurt it, so it needs the backdoor draw to have somewhere to go."
- **A♥Q♣ on Q♥2♦6♥ against A♣Q♦.** "Both bet about as often. The heart makes this one worth a fifth of a pot more: on a heart turn it is top pair with the nut draw and can keep betting or call a raise."
- **A♠J♠ in position on 9♥7♦2♣.** "Ace high checks here more than weaker hands do. It wins some pots unimproved, and a check behind sees the turn for free."
- **K♠5♠ on the turn of 9♠8♥2♠ 3♦, no pair.** "This bets because it holds the king of spades. He folds more when you hold a card his flush draws need."
- **J♥T♥ on Q♥9♣2♦, facing a bet.** "The open-ender raises more than a gutshot would. A draw this strong is happy to get the money in."

## Limits

- **Bet-size tree.** One raise size (3x) and one re-raise at most. "Getting jammed on" exists only in the low-stack pots. A tree with a second raise size might treat raise-averse hands differently.
- **Facing a raise.** Collected on 17 flops only, added late. The numbers above for it are indicative.
- **4-bet pots are over-weighted** (32 of 86 flops) against how often they happen. Every idea marked as holding or reversed has the same sign in the single-raised pots alone, usually larger.
- **Value sizing effects are small.** Nothing found moves a hand's size by more than a few percent of the range between sizes.
- **Turn facing-a-bet decisions were not collected.**
- **Not yet in the app.** The explanation layer does not use any of this.
