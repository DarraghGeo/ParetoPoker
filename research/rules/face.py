# Facing a bet or a raise: the threshold to continue (the price, plus or minus something), the threshold to raise, and what a
# draw should do. By street, seat and the size faced. Cost first order, % of the pot at the decision.
import sys, numpy as np, collections
from load import load, wmean
D = [d for d in load() if d['what'] in ('facingBet', 'facingRaise') and 'fold' in d['kinds'] and 'call' in d['kinds']]
names = {3: 'flop', 4: 'turn', 5: 'river'}; DS = np.arange(-3, 6) / 20; RS = [0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.01]
def price(d): s = d['faced']; return s / (1 + 2 * s)
def cost(d, delta, raise_from, draws=0, exact=None):
    f, c = d['kinds'].index('fold'), d['kinds'].index('call'); r = next((a for a, k in enumerate(d['kinds']) if k in ('raise', 'allin')), None); t = price(d) + delta if exact is None else exact; total = 0.0; e = (np.arange(20) + .5) / 20
    for cb in range(3):
        for eb in range(20):
            lo = eb / 20; act = r if (r is not None and lo >= raise_from - 1e-9) else c if (e[eb] >= t or (draws and cb >= 3 - draws)) else f
            total += d['R'][act][:, eb, cb].sum()
    return 100 * total
def group(d): return (d['street'], d['what'], d['ip'], int(np.digitize(d['faced'], [0.5, 1.0])))
G = collections.defaultdict(list)
for d in D: G[group(d)].append(d)
print(len(D), 'decisions facing a bet or raise')
for key in sorted(G):
    H = G[key]; st, what, ip, sz = key
    if len(H) < 10: continue
    drs = (0, 1, 2) if st < 5 else (0,)
    best = min(((wmean(H, lambda d: cost(d, dl, rf, dr)), dl, rf, dr) for dl in DS for rf in RS for dr in drs), key=lambda x: x[0]); nor = min(((wmean(H, lambda d: cost(d, dl, 1.01, dr)), dl, dr) for dl in DS for dr in drs), key=lambda x: x[0])
    sol = 1 - wmean(H, lambda d: d['freq'][d['kinds'].index('fold')]); rz = wmean(H, lambda d: sum(d['freq'][a] for a, k in enumerate(d['kinds']) if k in ('raise', 'allin')))
    print(f'\n{names[st]} {what} {"IP " if ip else "OOP"} bet {["small (under half pot)", "medium", "big (over the pot)"][sz]:22s} n {len(H):4d}  mean price {100*wmean(H, price):.0f}% | solution continues {100*sol:.0f}%, raises {100*rz:.0f}% (its cost {wmean(H, lambda d: 100 * d["sol"]):.2f})')
    print(f'    best: price {100*best[1]:+.0f} points, raise from {100*best[2]:.0f}{" (never)" if best[2] > 1 else ""}{", draws continue" if best[3] == 1 else ", draws and gutshots continue" if best[3] == 2 else ""}: cost {best[0]:.2f} | without raising: price {100*nor[1]:+.0f}{", draws continue" if nor[2] == 1 else ", draws+gutshots continue" if nor[2] == 2 else ""} {nor[0]:.2f}')
    print('    by threshold (no raise, draws as hands): ' + '  '.join(f'{100*dl:+.0f}:{wmean(H, lambda d: cost(d, dl, 1.01, 0)):.2f}' for dl in DS) + (f' | at the price with draws continuing {wmean(H, lambda d: cost(d, 0, 1.01, 1)):.2f}, +8 with draws {wmean(H, lambda d: cost(d, 0.1, 1.01, 1)):.2f}' if st < 5 else ''))
    if st < 5:
        # what a draw is worth: for the draws under the price, calling against folding
        dc = wmean(H, lambda d: 100 * sum(d['R'][d['kinds'].index('call')][:, eb, 2].sum() - d['R'][d['kinds'].index('fold')][:, eb, 2].sum() for eb in range(20) if (eb + .5) / 20 < price(d))); share = wmean(H, lambda d: sum(d['S'][:, eb, 2].sum() for eb in range(20) if (eb + .5) / 20 < price(d)))
        print(f'    draws under the price: {100*share:.1f}% of the range; calling them costs {dc:+.2f} more than folding')
