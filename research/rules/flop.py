# The flop when betting: simple plans by seat and by who has the range advantage (the chart's count: top pair or better).
import numpy as np, collections, sys
from load import wmean
from bet2 import D, table, VS, BS
ST = int(sys.argv[1]) if len(sys.argv) > 1 else 3; G3 = [d for d in D if d['street'] == ST]; g = lambda x: int(np.abs(VS - x).argmin()); b = lambda x: int(np.abs(BS - x).argmin())
PLANS = {'value 50+, under 20, draws': lambda t: t[g(.5), b(.2), 1], 'value 50+ and draws': lambda t: t[g(.5), 0, 1], 'value 60+ and draws': lambda t: t[g(.6), 0, 1], 'value 75+': lambda t: t[g(.75), 0, 0], 'check everything': lambda t: t[len(VS) - 1, 0, 0], 'bet everything': lambda t: t[0, b(0.4), 2] if False else None, 'value 50+, everything under 40, draws': lambda t: t[g(.5), b(.4), 2], 'value 60+, under 30, draws': lambda t: t[g(.6), b(.3), 1],
         'value 70+ and draws': lambda t: t[g(.7), 0, 1], 'value 70+': lambda t: t[g(.7), 0, 0], 'value 80+': lambda t: t[g(.8), 0, 0], 'value 80+ and draws': lambda t: t[g(.8), 0, 1]}
def all_in(d, s):
    bb = [(a, d['sizes'][a]) for a, k in enumerate(d['kinds']) if k in ('bet', 'allin')]; a, size = min(bb, key=lambda x: abs(x[1] - s)); return 100 * d['R'][a].sum() if abs(size - s) <= 0.2 else None
for ip in (0, 1):
    for adv, nm in ((None, 'all'), (0, 'behind'), (1, 'even'), (2, 'ahead'), (10, 'his strong under 20%'), (11, 'his strong 20%+')):
        H = [d for d in G3 if d['ip'] == ip and (adv is None or (adv < 10 and int(np.digitize(d['top_me'] - d['top_him'], [-0.04, 0.04])) == adv) or (adv >= 10 and (d['his_strong'] >= 0.2) == (adv == 11)))]
        if len(H) < 6: continue
        print(f'\n{ST} {"IN position" if ip else "OUT of position"}, range {nm} (n {len(H)}): the solution bets {100*wmean(H, lambda d: 1 - d["freq"][d["kinds"].index("check")]):.0f}% (equity gap {100*wmean(H, lambda d: d["gap"]):+.0f}); its cost {wmean(H, lambda d: 100*d["sol"]):.2f}')
        for s in (0.33, 0.75):
            T = [(d, table(d, s)) for d in H]; T = [(d, t) for d, t in T if t is not None]
            if len(T) < 6: continue
            w = np.array([d['weight'] for d, _ in T], float); w /= w.sum(); out = []
            for name, f in PLANS.items():
                if name == 'bet everything': out.append(f'bet everything {float(w @ np.array([all_in(d, s) for d, _ in T])):.2f}')
                else: out.append(f'{name} {float(w @ np.array([f(t) for _, t in T])):.2f}')
            print(f'   size {s}: ' + ' | '.join(out))
