# Engine work log (overnight, target: every board and seat under 20% exploitable)

Read this first after any break. The engine is `engine.mjs`; the test is `play.mjs`; the current rules are the `NOW` object in `play.mjs`.

## How to run
- All nine boards, arms side by side: `TAG=<name> TRY='[["now",{}],["x",{...changes to NOW...}]]' research/engine/boards.sh all` (also `short`, `deep`, or a quoted list of spots). It skips boards already in `out/play-engine-<TAG>.jsonl` and prints `table.py`.
- Where a seat leaks: `KEEP=all,onlyFlop,... SPOT=<spot> NODECOMP=1 ARMS=engine EXCEPT=1 TREE=raise TAG=<name> node research/engine/play.mjs 1 1` (at most 7 arms on a single-raised pot, or memory runs out).
- Engine beside solution by strength at each decision: `FACING=1 FACING_STREET=all BETTING=1 BETTING_STREET=all` then `where.py`.
- Range make-up by line: `COMP=1` then `composition.py`.
- Never put a `//` comment in the middle of a one-line statement when patching: it cuts the line.

## Boards
4BP-SB-BU:3sKs9c 4BP-CO-BU:2dKsKd 4BP-UTG-CO:7s3cQc 3BP-UTG-HJ:2cAcAh 3BP-SB-BB:6hKdAh SRP-UTG-HJ:2s6d8h SRP-UTG-HJ:JdQs5h SRP-UTG-CO:As6c6h SRP-BB-HJ:7hTd6d

## State at the start of the night (gives up OOP/IP, exploitable OOP/IP)
K93 1.3/0.8 17/15 | KK2 2.0/1.4 15/18 | Q73 2.1/1.5 19/26 | AA2 1.4/1.4 15/24 | AK6 1.4/2.1 18/24 | 862 1.4/1.4 19/42 | QJ5 2.9/1.8 24/36 | A66 2.8/2.0 24/53 | T76 1.9/2.7 19/39

## Lessons so far
- Diagnose by handing decisions to the solution (EXCEPT) before proposing a fix; frequency comparisons mislead.
- Copying the solution's frequency with our own hands and ranges has failed every time.
- Facing a bet: amount matters, order by equity against his strongest hands plus improvement. Bets: hands matter once the amount is right; bet gain against a textbook opponent beats equity.
- Stated rules on file (see the review in the chat): bet share = value + bluffs, out of position net of his; defence in position MDF, out of position MDF x min(1, 2 x range equity); fold order by equity against his calling range plus swing.

## Log
- r1 (6 boards, stopped): book bets (share = value + bluffs net of his, hands by bet gain) and book defence (MDF in position, MDF x 2 x range equity out, kept by top + draw on flop and turn) as wholesale replacements are both WORSE: mean exploit 17/26 now, 19/37 book bets, 20/31 book defence; book bets give up 9-11% in position on K93 and AA2 (it stops betting the whole range as the last raiser). Not adopted. Also: 862 in position went 42 -> 47 after the flop exact + keep rule adopted on QJ5 alone: every adoption needs all boards.
- r2 (3 deep boards; the cells arms were not applied through a bug, fixed): flop exact + keep is roughly neutral over the deep boards (IP 40.0 with, 40.8 without: QJ5 35 v 39, 862 47 v 46, A66 38 v 37): kept. Deep boards IP now: 862 47, QJ5 35, A66 38 (A66 was 53 before the merged-range flop rules; 862 was 42).
