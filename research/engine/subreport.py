# The engine on many subgames (play.mjs with SUB=river|turn): each arm's mean and tail, by seat and by stack.
#   python3 research/engine/subreport.py out/play-engine-<tag>.jsonl
import json, sys
import numpy as np
rows = [json.loads(t) for t in open(sys.argv[1])]; arms = list(rows[0]['loss']['oop']); print(len(rows), 'spots')
print('| arm | gives up: OOP | IP | exploitable: OOP mean | 90th pct | IP mean | 90th pct |'); print('|---|---|---|---|---|---|---|')
for a in arms:
    lo = [r['loss']['oop'][a] for r in rows]; li = [r['loss']['ip'][a] for r in rows]; bo = [r['br']['oop'][a] for r in rows if a in r['br']['oop']]; bi = [r['br']['ip'][a] for r in rows if a in r['br']['ip']]
    print(f"| {a} | {np.mean(lo):.2f} | {np.mean(li):.2f} | " + (f"{np.mean(bo):.1f} | {np.percentile(bo, 90):.1f} | {np.mean(bi):.1f} | {np.percentile(bi, 90):.1f} |" if bo else '- | - | - | - |'))
print('\nby stack behind (exploitable OOP / IP, mean):')
for st in sorted({r['spr'] for r in rows}):
    g = [r for r in rows if r['spr'] == st]; print(f"  {st} pots ({len(g)}): " + '; '.join(f"{a} {np.mean([r['br']['oop'][a] for r in g]):.1f}/{np.mean([r['br']['ip'][a] for r in g]):.1f}" for a in arms if a in g[0]['br']['oop']))
