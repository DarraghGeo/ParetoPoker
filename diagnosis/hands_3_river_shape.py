"""River: the action as a function of equity against his range, where its thresholds sit, what
moves them from spot to spot, and how they compare with the von Neumann thresholds (Ferguson &
Ferguson, section 5.3) computed from hero's own equity distribution."""
import sys, numpy as np, pandas as pd
sys.path.insert(0, 'diagnosis')
from hands_load import load, wmean
from scipy.stats import spearmanr
df = load(*sys.argv[1:])
df = df[df.street == 'river']
bins = [0, .1, .2, .3, .4, .5, .6, .7, .8, .9, 1.0001]
print("== A. First to act: how often the solver bets, by the hand's equity against his range")
for pos, g in df[df.kind == 'open'].groupby('position'):
    g = g.assign(b=pd.cut(g['eq'], bins, right=False))
    print(f" {pos}: " + ' '.join(f"{wmean(x.pAgg, x.w):.2f}" for _, x in g.groupby('b', observed=True)) + "   (equity 0-10% ... 90-100%)")
    big = g[g.nAgg > 1]
    print(f"     of its bets, the share at the biggest size: " + ' '.join(f"{(x.pBig*x.w).sum()/max(1e-9,(x.pAgg*x.w).sum()):.2f}" for _, x in big.assign(b=pd.cut(big['eq'], bins, right=False)).groupby('b', observed=True)))
print("\n== B. Facing a bet or raise: fold / call / raise by equity minus the pot odds (the equity a call needs)")
f = df[df.kind != 'open'].copy()
f['odds'] = f.faced / (1 + 2 * f.faced)
f['edge'] = f['eq'] - f.odds
eb = [-1, -.2, -.1, -.05, -.02, .02, .05, .1, .2, .4, 1]
for (kind, pos), g in f.groupby(['kind', 'position']):
    g = g.assign(b=pd.cut(g.edge, eb))
    print(f" {kind} {pos}")
    for b, x in g.groupby('b', observed=True):
        print(f"    edge {str(b):>14}: share of range {x.w.sum()/g.w.sum():.2f}  fold {wmean(x.pPassive,x.w):.2f} call {wmean(x.pCall,x.w):.2f} raise {wmean(x.pAgg,x.w):.2f}   continue: must {x.w[x.contStatus=='must'].sum()/x.w.sum():.2f} optional {x.w[x.contStatus=='optional'].sum()/x.w.sum():.2f} can't {x.w[x.contStatus=='cant'].sum()/x.w.sum():.2f}")
    near = g[g.edge.abs() <= 0.02]
    if len(near) > 50:
        q = pd.qcut(near.edge.rank(method='first'), 5, labels=False)
        print("    inside the +-2% band, by fifths of the edge (lowest first): continue " + ' '.join(f"{wmean(x.pCont, x.w):.2f}" for _, x in near.groupby(q)) + "   | blocks his best quarter more than his worst, by fifths: " + ' '.join(f"{wmean(x.pCont, x.w):.2f}" for _, x in near.groupby(pd.qcut(near.blockEdge.rank(method='first'), 5, labels=False))))
    right = ((g.edge > 0) == (g.pCont > 0.5))
    print(f"    'continue when equity beats the pot odds' agrees with the solver's majority action for {wmean(right, g.w):.3f} of the range; among hands that are not optional {wmean(right[g.contStatus!='optional'], g.w[g.contStatus!='optional']):.3f}")

print("\n== C. First to act: thresholds per decision, against the von Neumann thresholds from the equity curve")
def threshold(x, upper):
    # the equity cut that best separates betting from checking on one side of the range
    x = x[x['eq'] >= 0.45] if upper else x[x['eq'] < 0.45]
    if len(x) < 5: return np.nan
    x = x.sort_values('eq'); w = x.w.values; p = x.pAgg.values; e = x['eq'].values
    best, at = 1e18, np.nan
    for k in range(len(x) + 1):
        err = (w[:k] * (p[:k] if upper else 1 - p[:k])).sum() + (w[k:] * ((1 - p[k:]) if upper else p[k:])).sum()
        if err < best: best, at = err, (e[k] if k < len(x) else 1.0) if upper else (e[k - 1] if k > 0 else 0.0)
    return at
def von_neumann(x, s):
    # b solves F((B+2)b - (B+1)) = B/(B+2) (1 - F(b)), B = 2s; F = hero's equity distribution
    B = 2 * s; e = x['eq'].values; w = x.w.values / x.w.sum()
    F = lambda t: w[e < t].sum()
    lo, hi = (B + 1) / (B + 2), 1.0
    for _ in range(40):
        b = (lo + hi) / 2
        if F((B + 2) * b - (B + 1)) - B / (B + 2) * (1 - F(b)) < 0: lo = b
        else: hi = b
    return b, (B + 2) * b - (B + 1), 1 - F(b) + F((B + 2) * b - (B + 1))
rows = []
for did, x in df[df.kind == 'open'].groupby('did'):
    r = x.iloc[0]
    size = wmean(x.bestSize.fillna(r.mainSize), x.w * x.pAgg) if (x.pAgg * x.w).sum() > 0 else r.mainSize
    b, a, freq = von_neumann(x, size)
    rows.append(dict(did=did, position=r.position, pair=r['pair'], depth=r.depth, board=r.board, fAgg=r.fAgg, size=size, value=threshold(x, True), bluff=threshold(x, False),
                     vnValue=b, vnBluff=a, vnFreq=freq, rangeEq=r.rangeEq, nutEdge=r.nutShare - r.hisNutShare, airShare=r.airShare, hisAirShare=r.hisAirShare, spr=r.spr,
                     topChecks=wmean(1 - x.pAgg[x['rank'] > .9], x.w[x['rank'] > .9])))
t = pd.DataFrame(rows)
for pos, g in t.groupby('position'):
    print(f" {pos}: {len(g)} decisions. solver bets {g.fAgg.mean():.2f} (von Neumann from the curve {g.vnFreq.mean():.2f}; correlation across spots {spearmanr(g.fAgg, g.vnFreq)[0]:.2f})")
    print(f"     lowest value bet, equity: solver {g.value.mean():.2f} (sd {g.value.std():.2f}); von Neumann {g.vnValue.mean():.2f}; correlation {spearmanr(g.value, g.vnValue, nan_policy='omit')[0]:.2f}; mean gap {np.nanmean(g.value - g.vnValue):+.2f}")
    print(f"     highest bluff, equity:    solver {g.bluff.mean():.2f} (sd {g.bluff.std():.2f}); von Neumann {g.vnBluff.mean():.2f}; correlation {spearmanr(g.bluff, g.vnBluff, nan_policy='omit')[0]:.2f}")
    print(f"     the top tenth of the range checks {g.topChecks.mean():.2f} of the time")
    print("     what moves them (Spearman correlation across spots):")
    for target in ('value', 'bluff', 'fAgg', 'topChecks'):
        print(f"       {target:<10}" + ' '.join(f"{c} {spearmanr(g[target], g[c], nan_policy='omit')[0]:+.2f}" for c in ('size', 'spr', 'rangeEq', 'nutEdge', 'airShare', 'hisAirShare')))
    print("     by pair of ranges: " + ' | '.join(f"{p}: bets {x.fAgg.mean():.2f}, value from {x.value.mean():.2f}, bluffs to {x.bluff.mean():.2f}, top checks {x.topChecks.mean():.2f}" for p, x in g.groupby('pair')))
t.to_csv('diagnosis/hands/3-river-thresholds.csv', index=False)
