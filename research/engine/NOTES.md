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
- r3 (3 deep boards): the solved equity-band answers (cells.json) dropped into the current engine are far worse at every decision tried (gives up 4-64%, exploitable 31-520%). They were solved for another game's ranges and read equity against the starting range; not usable as a patch. Dropped.
- The owner shared "Range Butterfly" (a page on the same solver: board, two ranges as eight bars by hand row, drag to add or remove hands, solve). Idea: run thousands of solves with ranges changed in controlled ways and look for rules in how frequencies and the shape inside each bar respond. Being built as sweep.mjs (headless, same solver).
- r4 (all 9 boards): river rules read off the 30,000-river sweep. Bets (value 80% instead of 85, thinner when shallow, OOP checks a third of value, check-all gate at 30%): about neutral (mean exploit 17.7/30.9 against 18.8/29.1). Defence as a line in range equity (the solver's own amounts): much worse (31/50). Not adopted. Again: the solution's amounts do not transfer; MDF-style defence is what protects.
- THE FAST LAB: `SUB=river|turn` in play.mjs makes subgames (pot 100, random stack, reshaped ranges), `lab.sh` runs four processes. Rivers: ~50 spots a second; turns: ~1 a second. Use it for anything on turn or river before touching the nine boards.
- Lab results: river subgames, engine now 4-6% exploitable both seats at every depth (original rules 10-20%); variants of fill, value line, bluff ratio all within a point: the river rules are near their best on generic ranges. Turn subgames to 5 pots deep: 9/9%. Turn subgames 8-12 pots deep: OOP 12-16%, IP 24-29% (p90 40%+): this is the single-raised in-position problem in miniature. There: engine on the river only (solution's turn) 8.7/14.7; solution's turn bets alone or solution's turn defence alone each take only ~4 points off IP; eight single-rule variants all within 3 points.
- Lab, deep turn subgames (8-12 pots), one decision at a time: IP river bets alone 13.7, IP turn bets alone 18.6, IP turn facing 15.3, IP river facing 9.0; OOP turn bets alone 15.7.
- Lab: turn bets. OOP checking every turn 15.7 -> 7.8 (and gives up less). IP: checking half of the value bets 18.6 -> 14.6; draws no longer bet automatically 13.8. Tighter value (85, 90) no help; more bluffs much worse.
- ADOPTED from the lab (held on held-out seeds and at 1.25-5 pots): on the turn out of position checks everything (unless the shallow-turn rule applies); in position bets 75%+ half the time with bluffs at 0.75 of the ratio and no automatic draw bets. Deep turn subgames: 16.0/29.0 -> 13.5/24.8 (training), 14.7/27.5 -> 12.8/23.8 (held out). River value 10 points tighter takes IP 2 more points but gives up 0.3-0.4 more: not adopted yet.
- Lab: facing a turn bet in deep pots. No turn raises 15.3 -> 12.6 (IP alone at that decision); value raises only half the time 13.3 and keeps raises: ADOPTED (raises.valueShare.turn 0.5). Ordering the turn defence by top + draw is much worse than by equity (23.5): flop only. More bluff raises worse.
- Current rules on held-out turn subgames: shallow (0.4-0.75 pots) 9.6/5.6; medium (1.25-5) 11.8/16.9; deep (8-12) 12.5/22.8. River value 10 points tighter: deep IP 20.9 for 0.3 more given up; 15 points tighter 19.1 for 1.0 more. Not adopted.
- r5 (all 9 boards, current rules): OUT OF POSITION IS UNDER 20% ON ALL NINE (15-19). In position: K93 15, KK2 16, Q73 26, AA2 22, AK6 24, 862 42, QJ5 31, A66 33, T76 30 (mean 26.4, was 29.1). Gives up 1.8/1.7.
- River value 10 points tighter takes 2-5 points off the single-raised IP seats for 0.2-0.6 more given up: ADOPTED for deep (single-raised) pots only (deepRiverValueUp 0.1).
- A flop lab (SUB=flop, thinned ranges) is too slow to be useful: over 3 minutes a spot.
- Leak-finder, IP on the short boards: AK6 and Q73 are the flop bet when checked to (solution there: 17 and 14); AA2 is turn bets (16). The solution bets the flop merged at 37-58% on every board except where the last raiser is clearly ahead (AA2: 100%).
- r6 (5 short boards): in position on the flop checked to, range bet only as the last raiser with range equity 58%+, otherwise every hand bets 40%: IP Q73 26 -> 15, AK6 24 -> 20, KK2 16 -> 21, others unchanged; mean 20.4 -> 18.5. ADOPTED (flopIpMerged share 0.4). It overrides the deep-pot half.
- r7 (5 short boards): five in-position turn-bet variants (check a quarter, bluffs at the full ratio, value from 65, draws betting again) all within a point of now. Short boards IP now: K93 15, KK2 21, Q73 15, AA2 22, AK6 20. Left as is.
