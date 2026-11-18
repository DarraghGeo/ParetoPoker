# What the engine gave up, and what a perfect answer wins against it.   python3 research/engine/report.py [out/play-engine-<tag>.jsonl]
import json, sys, os, collections
import numpy as np
f = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'play-engine.jsonl'); rows = [json.loads(t) for t in open(f)]
print(f'{len(rows)} hands: ' + ', '.join(f'{n} {k}' for k, n in collections.Counter(r['action'] for r in rows).items()))
arms = [a for a in rows[0]['loss']['oop'] if a not in ('flop', 'flopTurn')]
print('\n| | gives up: OOP | IP | both | a perfect answer wins: OOP | IP |'); print('|---|---|---|---|---|---|')
for a in arms:
    lo = np.mean([r['loss']['oop'][a] for r in rows]); li = np.mean([r['loss']['ip'][a] for r in rows]); bo = [r['br']['oop'].get(a) for r in rows]; bi = [r['br']['ip'].get(a) for r in rows]
    print(f"| {a} | {lo:.2f} | {li:.2f} | {(lo + li) / 2:.2f} | " + (f"{np.mean(bo):.1f} | {np.mean(bi):.1f} |" if bo[0] is not None else '- | - |'))
for act in sorted({r['action'] for r in rows}):
    g = [r for r in rows if r['action'] == act]; print(f"\n{act} ({len(g)}): " + '; '.join(f"{a} {np.mean([(r['loss']['oop'][a] + r['loss']['ip'][a]) / 2 for r in g]):.2f}" for a in arms))
