# Each board, each arm: what the engine gives up to the solution and what a perfect answer wins, out of position / in position.
#   python3 research/engine/table.py out/play-engine-<tag>.jsonl
import json, sys
import numpy as np
rows = [json.loads(t) for t in open(sys.argv[1])]; arms = list(rows[0]['loss']['oop'])
print('| board | ' + ' | '.join(arms) + ' |'); print('|---|' + '---|' * len(arms))
for r in rows: print(f"| {r['action']} {r['board']} | " + ' | '.join(f"{r['loss']['oop'][a]:.1f}/{r['loss']['ip'][a]:.1f} {r['br']['oop'].get(a, 0):.0f}/{r['br']['ip'].get(a, 0):.0f}" for a in arms) + ' |')
print('| mean | ' + ' | '.join(f"{np.mean([r['loss']['oop'][a] for r in rows]):.2f}/{np.mean([r['loss']['ip'][a] for r in rows]):.2f} {np.mean([r['br']['oop'].get(a, 0) for r in rows]):.1f}/{np.mean([r['br']['ip'].get(a, 0) for r in rows]):.1f}" for a in arms) + ' |')
print('| worst exploit | ' + ' | '.join(f"{max(r['br']['oop'].get(a, 0) for r in rows):.0f}/{max(r['br']['ip'].get(a, 0) for r in rows):.0f}" for a in arms) + ' |')
