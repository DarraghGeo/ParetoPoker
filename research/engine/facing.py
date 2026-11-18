# Facing a bet or raise on one street: the engine's answers beside the solution's for the same hands, by equity band.
#   python3 research/engine/facing.py out/play-engine-<tag>.jsonl
import json, sys
B = ['under 20%', '20-35%', '35-50%', '50-65%', '65-80%', '80%+']
for t in open(sys.argv[1]):
    r = json.loads(t); print(r['spot'], r['board'])
    for key, D in sorted(r['facing'].items()):
        w = D['w']; tot = [sum(b[j] for b in D['bands']) for j in range(7)]
        print(f"\n{key}: price {100 * D['price'] / w:.0f}%, minimum defence {100 * D['mdf'] / w:.0f}%; continues: engine {100 * (1 - tot[1] / w):.0f}%, solution {100 * (1 - tot[2] / w):.0f}%; raises: engine {100 * tot[3] / w:.0f}%, solution {100 * tot[4] / w:.0f}%")
        print('| equity | share of range | engine folds | solution folds | engine raises | solution raises | strong draws in band |'); print('|---|---|---|---|---|---|---|')
        for n, b in zip(B, D['bands']):
            if b[0] > 0: print(f"| {n} | {100 * b[0] / w:.0f}% | {100 * b[1] / b[0]:.0f}% | {100 * b[2] / b[0]:.0f}% | {100 * b[3] / b[0]:.0f}% | {100 * b[4] / b[0]:.0f}% | {100 * b[5] / b[0]:.0f}% |")
