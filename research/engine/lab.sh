#!/bin/bash
# The engine on many subgames, four processes at once.   TAG=<name> TRY='[[...]]' research/engine/lab.sh <turn|river> <spots per process> <first seed> [stacks, e.g. 800,1200]
cd "$(dirname "$0")/../.." || exit 1
export SUB=$1 NODECOMP=1 ARMS=engine; [ -n "$4" ] && export SUBSTACKS=$4
pids=(); for i in 0 1 2 3; do node research/engine/play.mjs "$2" $(($3 + i)) > /dev/null 2>&1 & pids+=($!); done; for p in "${pids[@]}"; do wait "$p"; done
python3 research/engine/subreport.py "research/engine/out/play-engine-$TAG.jsonl"
