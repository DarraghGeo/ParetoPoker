#!/bin/sh
# Runs diagnosis/v63.mjs on a set in four slices side by side and averages them.
#   sh diagnosis/par.sh <set> <rows>
set=$1; rows=$2; dir=$(mktemp -d)
for k in 0 1 2 3; do SLICE=$k/4 node diagnosis/v63.mjs "$set" all "$rows" > "$dir/$k" 2>&1 & done
wait
cat "$dir"/* | python3 -c "
import sys, re, collections
rows = collections.OrderedDict()
for line in sys.stdin:
    m = re.match(r'(\S+)\s+(.*?)\s+oop\s+([\d.-]+) /\s+([\d.-]+) \| ip\s+([\d.-]+) /\s+([\d.-]+) \|', line)
    if not m: print(line.rstrip()); continue
    rows.setdefault((m.group(1), m.group(2)), []).append([float(x) for x in m.groups()[2:]])
for (s, label), v in rows.items():
    a = [sum(x[i] for x in v) / len(v) for i in range(4)]
    print(f'{s:<12} {label:<46} oop {a[0]:5.2f} / {a[1]:5.2f} | ip {a[2]:5.2f} / {a[3]:5.2f} | both {(a[0]+a[2])/2:5.2f} / {(a[1]+a[3])/2:5.2f}  ({len(v)} slices)')
"
