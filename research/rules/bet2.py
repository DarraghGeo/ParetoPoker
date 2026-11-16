# Betting thresholds that depend on what the chart shows of him: how much of his range is strong (80% equity or more against
# mine) and how much is weak (under 30%). For each street, seat and size: the best value and bluff thresholds in each
# bucket, found on some spots and scored on the others.
import sys, numpy as np, collections
from sklearn.model_selection import GroupKFold
from load import load, wmean
D = [d for d in load() if d['what'] in ('first', 'checkedTo') and 'check' in d['kinds'] and any(k in ('bet', 'allin') for k in d['kinds'])]
NV, NB = 11, 9; VS = np.arange(10, 21) / 20; BS = np.arange(0, NB) / 20; names = {3: 'flop', 4: 'turn', 5: 'river'}
def table(d, s):
    """cost[V, B, draws] of betting the size nearest s, in % of the pot; None if no such size."""
    b = [(a, d['sizes'][a]) for a, k in enumerate(d['kinds']) if k in ('bet', 'allin')]; a, size = min(b, key=lambda x: abs(x[1] - s))
    if abs(size - s) > 0.2: return None
    x = d['kinds'].index('check'); gain = (d['R'][a] - d['R'][x]).sum(0); base = d['R'][x].sum(); out = np.zeros((NV, NB, 3)); cum = np.cumsum(gain, 0)   # gain[eb, cb]: betting less checking
    for vi in range(NV):
        top = gain[10 + vi:].sum()
        for bi in range(NB):
            low = gain[:bi].sum()
            for dr in range(3): out[vi, bi, dr] = base + top + low + (gain[bi:10 + vi, 3 - dr:].sum() if dr else 0)
    return 100 * out
def buckets(d): return (int(np.digitize(d['his_strong'], [0.1, 0.2, 0.3])), int(np.digitize(d['his_weak'], [0.15, 0.35])))
def study(G, s, label, key=buckets, drs=(0,)):
    T = [(d, table(d, s)) for d in G]; T = [(d, t) for d, t in T if t is not None]
    if len(T) < 12: return
    w = np.array([d['weight'] for d, _ in T]); C = np.array([t for _, t in T]); g = np.array([d['spot'] for d, _ in T]); keys = [key(d) for d, _ in T]; W = w / w.sum()
    flat = (W[:, None, None, None] * C).sum(0); i = np.unravel_index(flat[:, :, list(drs)].argmin(), flat[:, :, list(drs)].shape); one = flat[:, :, list(drs)][i]
    # by bucket, cross-validated
    pred = np.zeros(len(T)); folds = GroupKFold(min(5, len(set(g)))).split(C, None, g)
    for tr, te in folds:
        best = {}
        for k in set(keys):
            m = [j for j in tr if keys[j] == k]
            if len(m) >= 6: c = (w[m][:, None, None, None] * C[m]).sum(0)[:, :, list(drs)]; best[k] = np.unravel_index(c.argmin(), c.shape)
        c = (w[tr][:, None, None, None] * C[tr]).sum(0)[:, :, list(drs)]; fallback = np.unravel_index(c.argmin(), c.shape)
        for j in te: v, b, q = best.get(keys[j], fallback); pred[j] = C[j][v, b, drs[q]]
    oracle = np.array([t[:, :, list(drs)].min() for _, t in T]); allx = np.array([100 * d['R'][d['kinds'].index('check')].sum() for d, _ in T]); sol = np.array([100 * d['sol'] for d, _ in T])
    print(f'{label} size {s}: {len(T)} decisions | check all {W @ allx:.2f} | one pair V{100*VS[i[0]]:.0f} B{100*BS[i[1]]:.0f}{" d" + str(drs[i[2]]) if len(drs) > 1 else ""} {one:.2f} | by bucket {W @ pred:.2f} | best pair per decision {W @ oracle:.2f} | solution {W @ sol:.2f}')
    for k in sorted(set(keys)):
        m = [j for j in range(len(T)) if keys[j] == k]
        if len(m) < 10: continue
        c = (w[m][:, None, None, None] * C[m]).sum(0)[:, :, list(drs)] / w[m].sum(); v, b, q = np.unravel_index(c.argmin(), c.shape); G2 = [T[j][0] for j in m]
        print(f'     his strong {["<10", "10-20", "20-30", "30+"][k[0]]:6s} his weak {["<15", "15-35", "35+"][k[1]]:6s} n {len(m):4d}: value from {100*VS[v]:3.0f}{" (none)" if VS[v] >= 1 else "":7s} bluff under {100*BS[b]:2.0f}{" +draws" if drs[q] == 1 else " +draws,gutshots" if drs[q] == 2 else ""}  cost {c[v, b, q]:.2f} (check all {c[NV - 1, 0, 0]:.2f}) | solution bets {100*wmean(G2, lambda d: 1 - d["freq"][d["kinds"].index("check")]):.0f}%')
st = int(sys.argv[1]) if len(sys.argv) > 1 else 5
for ip in (0, 1):
    G = [d for d in D if d['street'] == st and d['ip'] == ip]
    for s in ((0.33, 0.75, 1.25) if st == 3 else (0.33, 0.75, 1.5)): study(G, s, f'\n{names[st]} {"IN position" if ip else "OUT of position"}', drs=(0,) if st == 5 else (0, 1, 2))
