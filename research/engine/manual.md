# A simple postflop manual

Heads-up after the flop, one situation at a time. Built from the rules the engine ended on. Played exactly, with exact
equities, those rules were 16% exploitable out of position and 24% in position on nineteen boards (worst seat 38%). A
person will be looser than that; the aim here is under 40% everywhere.

## 1. Before every decision, read four things

| Read | How |
|---|---|
| **Your hand's bucket** | See section 2 |
| **Who raised last before the flop** | The last raiser, or the caller |
| **Who is ahead** | Who has more top pair or better on this board. "Clearly ahead" = you'd expect to win about 6 times in 10 range against range |
| **Depth** | Stack behind ÷ pot. Short: under about 1 pot. Deep: 8 pots or more (single-raised pots on the flop) |

## 2. The buckets

Bucket your hand by how often it beats his range **as he stands now** (after his last action).

| Bucket | Equity | Typical |
|---|---|---|
| **A, very strong** | 80%+ | beats nearly all his value |
| **B, strong** | 65-80% | ahead of most of his range |
| **C, middle** | 35-65% | beats his bluffs, loses to his value |
| **D, weak** | under 35% | needs him to fold |
| **Draw** | any | flush draw or open-ended straight draw |

Quick estimate: start from the share of his hands you beat right now. On the turn add about 10 points for a draw; on
the flop about 17.

## 3. Three numbers to know by heart

| His bet (or yours) | Price to call | Defend at least | Bluffs per 10 value bets |
|---|---|---|---|
| A third of the pot | 20% | 3 hands in 4 | 2.5 |
| Three quarters | 30% | 4 in 7 | 4 |
| The pot | 33% | 1 in 2 | 5 |
| Twice the pot | 40% | 1 in 3 | 7 |

- **Price:** the equity you need to call.
- **Defend:** the share of your range that should not fold (call or raise).
- **Bluffs:** how many bluffs go with every ten value bets at that size.

## 4. The flop

**First to act**

| You are | Do |
|---|---|
| In position, checked to, last raiser and clearly ahead | Bet everything, small |
| In position, checked to, anything else | Bet 2 times in 5 with **every** bucket alike, small. Don't sort by strength |
| Out of position, last raiser, 3-bet or 4-bet pot | Bet everything, small |
| Out of position, last raiser, single-raised pot | Check everything |
| Out of position, caller | Check. Bet only if you are ahead on this board, and then only A, good B and draws |

**Facing a bet**

| You are | Do |
|---|---|
| In position | Fold only the bottom: against a small bet continue with 25%+ equity, and never fold more than about 1 hand in 4 |
| In position, single-raised pot | Also raise about 1 time in 4, with every bucket alike. When choosing what to fold, keep hands that can improve over hands that can't |
| In position, you raised preflop and he leads into you | Raise instead of calling |
| In position, you called preflop in a 3-bet or 4-bet pot | Never raise. Call with your best hands and let him keep betting |
| Out of position | Continue with 35%+ against a small bet (15 points over the price). Raise A only 1 time in 4 and call the rest; add a few draws as raises |

## 5. The turn

**First to act**

| You are | Do |
|---|---|
| Out of position | Check everything |
| Out of position, last raiser, under about 1 pot behind | This is your last real bet: play it by the river rules (section 6) |
| In position | Bet A and the better B (75%+), but only half the time. Add 3 bluffs for every 10 of those bets, from your **weakest** hands. Check C. Draws do not bet automatically |

**Facing a bet**

| You are | Do |
|---|---|
| In position | Defend the full amount from section 3 with your best hands by equity |
| Out of position | The same if your range is level with his betting range. If you are behind it, defend a little less; ahead, a little more |
| Either seat, with A | Raise half the time, call half. Bluff-raise with draws, in the ratio |

## 6. The river

**First to act**

| Bet size | Value bets from | In a single-raised pot |
|---|---|---|
| Small | 80% | 85% |
| Three quarters | 85% | 90% |
| Big | 90% | 95% |

- Bluffs: your **weakest** hands, in the ratio from section 3. Count them off your value bets.
- Check B and C. They beat what folds and lose to what calls.
- **Out of position:** if about 1 hand in 5 of his range is very strong, check everything.

**Facing a bet**

- Call with more equity than the price. Fold with less.
- If that leaves you folding more than the "defend" amount, add your next-best hands until you are close to it.
- Raise with 75%+ (80%+ against an overbet).

## 7. Five habits that matter more than any number

1. **Never fold too much.** Check the "defend" column. This single habit is worth more than everything else combined.
2. **Don't always raise your best hands.** Call with some of them, or your calls contain nothing strong.
3. **Count bluffs off value.** If you have few value bets, you have few bluffs.
4. **Bet the top and the bottom; check the middle.** A little on the turn, fully on the river.
5. **On the flop in position, bet a mix of everything,** not just your good hands.

## 8. How the streets differ

| Street | Shape of the betting range |
|---|---|
| Flop | Merged: weak, middle and strong hands bet about as often as each other |
| Turn | Starting to split: the middle bets less |
| River | Polar: top and bottom only |

Bigger bets are more polar than small ones, most of all on the river.

Who bet the street before matters after the flop. The player who bet has a polar range (many weak hands, few middle);
the player who called has a condensed one (few weak, many middle). **Bet into a condensed range; check to a polar one.**

## 9. What this manual does not cover

- Choosing between bet sizes. It assumes one size a street: small on the flop, about three quarters later.
- Re-raises.
- The in-position seat in single-raised pots is the weakest part even played exactly (24-38%).
- It has been measured as an engine playing these rules exactly, not as a person playing them from memory.
