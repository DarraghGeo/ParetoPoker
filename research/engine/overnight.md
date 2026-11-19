# The engine after the overnight run

Target: every seat on every board under 20% exploitable. Reached out of position on 17 of 19 boards; in position on 7 of
19. In position in single-raised pots (24-38%) is the part not solved.

All figures: one bet size a street (a third of the pot on the flop, three quarters on the turn and river) and one raise
to three times; exact equities. "Gives up" is against the solver's own play; "exploitable" is what a perfectly adapting
opponent wins. Both in percent of the pot as the flop starts.

## Where it stands: nineteen boards, one set of rules

| Board | Gives up, OOP / IP | Exploitable, OOP / IP |
|---|---|---|
| 4-bet K♠9♣3♠ | 1.1 / 0.9 | 17 / 15 |
| 4-bet K♠K♦2♦ | 2.0 / 1.3 | 15 / 21 |
| 4-bet Q♣7♠3♣ | 2.1 / 1.2 | 19 / 15 |
| 3-bet A♣A♥2♣ | 1.1 / 1.1 | 10 / 22 |
| 3-bet A♥K♦6♥ | 1.3 / 1.9 | 13 / 20 |
| Single-raised 8♥6♦2♠ | 2.0 / 2.5 | 14 / 35 |
| Single-raised Q♠J♦5♥ | 2.3 / 2.0 | 14 / 27 |
| Single-raised A♠6♣6♥ | 2.1 / 2.1 | 13 / 28 |
| Single-raised T♦7♥6♦ | 2.5 / 3.2 | 15 / 26 |
| 4-bet Q♥Q♠A♠ (fresh) | 1.4 / 2.6 | 11 / 12 |
| 4-bet A♥T♦8♠ (fresh) | 1.8 / 3.1 | 19 / 15 |
| 3-bet Q♣Q♥7♣ (fresh) | 1.4 / 2.0 | 15 / 29 |
| 3-bet Q♥7♦2♥ (fresh) | 2.8 / 2.0 | 33 / 24 |
| 3-bet J♠T♥8♠ (fresh) | 5.2 / 2.0 | 22 / 18 |
| Squeezed A♣3♥3♦ (fresh) | 1.8 / 1.5 | 18 / 20 |
| Single-raised Q♥9♦5♠ (fresh) | 2.8 / 4.0 | 13 / 38 |
| Single-raised A♣4♥2♠ (fresh) | 2.4 / 2.2 | 14 / 24 |
| Single-raised A♣K♣7♠ (fresh) | 3.0 / 3.2 | 15 / 28 |
| Single-raised K♠A♠Q♥ (fresh) | 1.7 / 1.6 | 10 / 34 |
| **Mean** | **2.1 / 2.1** | **16 / 24** |

The nine boards without "(fresh)" were used to choose rules. The ten fresh boards were dealt afterwards; the last rule
(flop raises) was then chosen with six of them in the test, so they are no longer fully clean either.

For scale, the original rules on the ten fresh boards: gives up 3.0 / 2.5, exploitable 53 / 103.

At the start of the night, on the nine working boards: exploitable 19 / 31 on average, with nine of eighteen seats under 20%.

## The rules as they now stand

Reads: each hand's equity against his range; a strong draw (flush draw or eight straight outs); the price, bet ÷ (pot +
2 × bet); MDF, 1 ÷ (1 + bet); ahead (top pair or better at least 4 points over his); his strong share (80%+ equity); your
range's equity; who raised last before the flop; stack behind in pots.

**Flop, first to act**
- In position, checked to: as the last raiser with 58%+ range equity, bet everything. Otherwise every hand bets 40% of the time.
- Out of position, last raiser: bet everything, except with eight or more pots behind, where everything checks.
- Out of position, caller: bet only when ahead, with 70%+ equity or a strong draw.

**Flop, facing a bet**
- In position: the price plus 5 points, filled to 90% of MDF. With eight or more pots behind: MDF, keeping hands by equity against his strongest hands plus their chance to improve, and every hand raises a quarter of the time.
- In position, as the last raiser, facing a lead: every continuing hand raises. As the caller in a short pot: no raises.
- Out of position: the price plus 15 points. Strong hands (80%+) raise a quarter of the time and call the rest; bluff raises beside them by the ratio.

**Turn, first to act**
- In position: 75%+ equity bets half the time; bluffs from the weakest hands at three quarters of the ratio; draws do not bet automatically.
- Out of position: check everything. Exception: the last raiser with under 1.2 pots behind plays the turn by the river rules.

**Turn, facing a bet**
- In position: MDF, best hands by equity. Out of position: 95% of MDF, three points more or fewer for each point of range equity above or below 50%.
- Strong hands (80%+) raise half the time; bluff raises by the ratio, draws first.

**River**
- Value from 85% equity for a three-quarter-pot bet (80% small, 90% large); 90% in single-raised pots. Bluffs: bet ÷ (1 + bet) per value bet, weakest first.
- Out of position: check everything if 20%+ of his range is strong.
- Facing a bet: call at the price, filled to 90% of MDF; raise with 75%+.

The rules live in the `NOW` object in `play.mjs`; `engine.mjs` holds the mechanisms.

## What worked, in order of size

1. **Balance when facing a bet or raise (fill toward MDF).** In position 114% to about 40% on the first board.
2. **Rules keyed to who raised last, not to seat,** for the flop.
3. **Out of position, check the turn; the last raiser out of position checks the flop in deep pots.**
4. **A merged range on the flop in position:** every hand bets the same share, in place of "everything" or "strong hands only".
5. **Strong hands raise only part of the time** on the flop (a quarter) and turn (half). Raising every strong hand leaves the calling range capped. This was the cause three separate times.
6. **In position on the turn, bet value only half the time, with bluffs counted off it.**
7. **River bluffs counted off value bets,** not off how many weak hands he holds.

## What did not work

- Copying the solver's frequencies into the engine. Tried for river defence (twice), turn defence, flop bets and turn bets; worse every time. Defending near MDF is what protects the engine; the solver's own smaller amounts only work together with the solver's ranges.
- The stated bet-share and defence formulas from the other engines, as wholesale replacements.
- The solved equity-band answers from the earlier restricted solves, dropped into this engine.
- Reading his range "before the bet" on the flop; more turn bluffs; raising from the top of the range; a turn defence ordered by improvement.

## Tools built tonight

- **The lab** (`lab.sh`, `SUB=river|turn` in `play.mjs`): the engine scored on generated spots, about 50 rivers or one turn a second, with held-out seeds. Rules found there carried over to real boards. It cannot do flops.
- **The sweep** (`sweep.mjs`): 30,000 solved rivers with reshaped ranges; the study note is `river-patterns.md`.
- **The leak-finder** (`EXCEPT=1`): the solver takes over one decision at a time. Every fix that worked started from it; every fix that started from a guess failed.
- **The substitution tests:** the solver's folds, raises, frequency or hands swapped in one at a time at a decision.

## What is still open

1. **In position in single-raised pots: 24-38%.** In the lab the turn-and-river part of this is about 22% on deep spots, and twelve variants of every setting in that seat moved it by under a point. The rule family is at its limit there; it needs a different idea for the deep turn, and the flop is the other half.
2. **Q♥7♦2♥ out of position (33%)** and **J♠T♥8♠ (22%, giving up 5.2%)**: big blind 3-betting an opener. Untouched by anything on the flop.
3. **Q♣Q♥7♣ in position (29%).**
4. **How the numbers were chosen.** Most thresholds and shares were picked by trying a few values. The lab made that sounder (60-400 spots, held-out seeds) than choosing on one hand, but they are still fitted numbers.
5. **Scope.** One bet size and one raise a street, exact equities, 19 boards.
