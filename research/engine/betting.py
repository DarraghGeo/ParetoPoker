# First to act on one street: the engine's bets beside the solution's for the same hands, by equity band, and what the
# solution's bet frequency moves with across decisions.   python3 research/engine/betting.py out/play-engine-<tag>.jsonl
import json, sys
import numpy as np
B = ['under 20%', '20-35%', '35-50%', '50-65%', '65-80%', '80%+']
for t in open(sys.argv[1]):
    r = json.loads(t); print(r['spot'], r['board']); tot = sum(D['w'] for D in r['facing'].values())
    for key, D in sorted(r['facing'].items(), key=lambda kv: -kv[1]['w']):
        w = D['w']; seat = key.split()[0]; share = w / sum(d['w'] for k, d in r['facing'].items() if k.startswith(seat))
        if share < 0.03: continue
        e = sum(b[1] for b in D['bands']) / w; s_ = sum(b[2] for b in D['bands']) / w
        print(f"\n{key} ({100 * share:.0f}% of this seat's turn bets): bets engine {100 * e:.0f}%, solution {100 * s_:.0f}%")
        print('| equity | share of range | engine bets | solution bets | strong draws in band | solution bets its draws |'); print('|---|---|---|---|---|---|')
        for n, b in zip(B, D['bands']):
            if b[0] > 0: print(f"| {n} | {100 * b[0] / w:.0f}% | {100 * b[1] / b[0]:.0f}% | {100 * b[2] / b[0]:.0f}% | {100 * b[3] / b[0]:.0f}% | {(100 * b[4] / b[3]) if b[3] > 0 else 0:.0f}% |")
        N = D['nodes']; ww = np.array([n['reach'] for n in N]); ww /= ww.sum(); sol = np.array([n['sol'] for n in N])
        if len(N) > 5 and sol.std() > 0:
            c = lambda f: float((ww @ ((np.array([n[f] for n in N]) - ww @ np.array([n[f] for n in N])) * (sol - ww @ sol))) / np.sqrt((ww @ (np.array([n[f] for n in N]) - ww @ np.array([n[f] for n in N])) ** 2) * (ww @ (sol - ww @ sol) ** 2) + 1e-12))
            print(f"across {len(N)} decisions the solution bets {100 * sol.min():.0f}% to {100 * sol.max():.0f}%; goes with: range equity {c('eq'):+.2f}, his strong share {c('hisStrong'):+.2f}, his weak share {c('hisWeak'):+.2f}, ahead {c('ahead'):+.2f}")
