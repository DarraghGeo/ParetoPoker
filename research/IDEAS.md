# Ideas to come back to

## Calculating the lines from the bet size (marked as a good one, to revisit)

On the river the two lines can be worked out, not recalled.

1. **Value line from the bet size.** He continues with 1/(1 + bet) of his range; a value bet must beat half of that. For a 75% bet: 71% of the way up his range (33%: 63%, 50%: 67%, pot: 75%, twice the pot: 83%).
2. **Find that point on the graph.** It is a point on his range; your hands level with it or above are value. Both ranges on one scale show where it cuts yours.
3. **Bluffs from the value count.** bet/(1 + bet) of a bluff for each value bet (75%: 3 for every 7), marked from the weak end, never into hands that win a showdown.

What testing said (`research/value/README.md`): the bluff ratio holds; the value line is better about 8 points tighter than the formula (80% for a 75% bet); first to act with him holding many strong hands, check everything; where most of his range is weak, more of the weak hands bet than the ratio allows. Only the 75% size and all-in were tested: the other sizes are the formula, untested.

Open: test the other sizes; rebuild the turn and the flop the same way; drills for "split his range into weak and strong" and "place your hand against his range".
