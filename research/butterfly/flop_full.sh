#!/bin/bash
# The flop tables solved and scored in a fuller game, start to finish, on a machine with several cores.
#   STORE=<a folder outside the repo> HUERO=<poker-huerosolver checkout> CORES=8 research/butterfly/flop_full.sh
# Needs python3 with numpy, and node (only to read poker-huerosolver's stored hands the first time). Safe to start again
# after a stop: finished parts are skipped and the table solves pick up from their last saved round.
#
# The game (change here or from the environment):
: "${GAME:=full}"                                   # the name results are filed under
: "${SIZES:=0.33,0.75|0.75,1.5|0.33,0.75,1.5}"      # bet sizes as shares of the pot: flop | turn | river
: "${RAISES:=2}"                                    # raises after a bet on each street (to three times; the stack caps them, so all-in is reached)
: "${K:=4}" "${M:=5}"                               # turn cards sampled a flop, river cards sampled a turn card
: "${CELLS:=}"                                      # extra columns on the tables, e.g. tilt or pot or tilt+pot
: "${ROUNDS:=200}" "${VALUE_ROUNDS:=300}"           # rounds for the tables, and for the game's value on the scoring flops
: "${SOLVE_ON:=24}" "${SCORE_ON:=20}"               # flops the tables are solved on (half 3-bet pots), flops they are scored on
: "${CORES:=8}"
export STORE GAME SIZES RAISES K M CELLS BAL=1 OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1
cd "$(dirname "$0")/../.." || exit 1; [ -n "$STORE" ] || { echo "set STORE"; exit 1; }; mkdir -p "$STORE/logs"; T=research/butterfly/restricted_flop.py
if [ ! -f "$STORE/flop-roots.jsonl" ]; then
  [ -f "$STORE/fullhand.jsonl" ] || node research/butterfly/store.mjs fullhand "$STORE/fullhand.jsonl" || exit 1
  python3 research/butterfly/flop_roots.py || exit 1
fi
pids=(); parts=$((CORES > 3 ? CORES - 2 : 1))
for h in 0 1; do nice -n 19 python3 $T $h "$ROUNDS" "$SOLVE_ON" "$SCORE_ON" >> "$STORE/logs/$GAME-seat$h.log" 2>&1 & pids+=($!); done
for ((i = 0; i < parts; i++)); do PART=-${i}of$parts nice -n 19 python3 $T base "$VALUE_ROUNDS" "$SOLVE_ON" "$SCORE_ON" >> "$STORE/logs/$GAME-value$i.log" 2>&1 & pids+=($!); done
fail=0; for p in "${pids[@]}"; do wait "$p" || fail=1; done
[ $fail = 0 ] || { echo "a job failed: see $STORE/logs"; exit 1; }
OUT=flop-report-$GAME.md python3 research/butterfly/flop_report.py > /dev/null && head -n 12 research/butterfly/flop-report-$GAME.md
echo "done: research/butterfly/flop-report-$GAME.md"
