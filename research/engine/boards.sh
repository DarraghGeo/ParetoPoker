#!/bin/bash
# The engine's test on a list of boards, one after another, each appended to out/play-engine-<TAG>.jsonl.
#   TAG=<name> TRY='[[...]]' research/engine/boards.sh [short|deep|all|"<spot> <spot> ..."]
cd "$(dirname "$0")/../.." || exit 1
SHORT="4BP-SB-BU:3sKs9c 4BP-CO-BU:2dKsKd 4BP-UTG-CO:7s3cQc 3BP-UTG-HJ:2cAcAh 3BP-SB-BB:6hKdAh"; DEEP="SRP-UTG-HJ:2s6d8h SRP-UTG-HJ:JdQs5h SRP-UTG-CO:As6c6h SRP-BB-HJ:7hTd6d"
case "${1:-all}" in short) L="$SHORT";; deep) L="$DEEP";; all) L="$SHORT $DEEP";; *) L="$1";; esac
for sp in $L; do grep -q "\"board\":\"${sp#*:}\"" "research/engine/out/play-engine-$TAG.jsonl" 2>/dev/null && continue; SPOT=$sp NODECOMP=1 ARMS=engine TREE=raise MAXMB=3000 node research/engine/play.mjs 1 1 2>&1 | tail -n 1 | cut -c1-60; done
python3 research/engine/table.py "research/engine/out/play-engine-$TAG.jsonl"
