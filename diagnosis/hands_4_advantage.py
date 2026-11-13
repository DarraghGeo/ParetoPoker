"""Step 4 to 6 by what an action is worth: for every hand, how much better betting (or raising,
or continuing) is than the alternative, as a share of the pot, from the solver's values. Which
features go with that advantage (rank correlation one at a time, then together in a weighted
linear fit on standardised features), and whether the spot changes it."""
import sys, numpy as np, pandas as pd
sys.path.insert(0, 'diagnosis')
from hands_load import load, wmean
from scipy.stats import spearmanr
df = load(*sys.argv[1:])
df['odds'] = df.faced / (1 + 2 * df.faced)
df['edge'] = df['eq'] - df.odds
df['variance'] = df.ehs2 - df['eq'] ** 2
df['advAgg'] = df[['gPassive', 'gCall']].min(axis=1) - df.gAgg       # > 0: betting or raising is better
df['advCont'] = df.gPassive - df[['gCall', 'gAgg']].min(axis=1)     # > 0: continuing is better
HAND = ['eq', 'rank', 'eqTop', 'now', 'drawEq', 'swing', 'variance', 'best', 'up', 'down', 'implied', 'spread', 'slope', 'blockEdge', 'bAll']
SOLVED = ['eqCalled', 'foldEdge']
SPOT = ['faced', 'spr', 'rangeEq', 'nutShare', 'hisNutShare', 'airShare', 'hisAirShare', 'paired', 'maxSuit', 'straighty']
def corr(x, y):
    ok = x.notna() & y.notna()
    return spearmanr(x[ok], y[ok])[0] if ok.sum() > 30 and x[ok].nunique() > 1 else np.nan
def linear(g, cols, target):
    g = g.dropna(subset=cols + [target]); X = g[cols].values.astype(float); w = g.w.values
    mu = np.average(X, axis=0, weights=w); sd = np.sqrt(np.average((X - mu) ** 2, axis=0, weights=w)); keep = sd > 1e-9
    Z = (X[:, keep] - mu[keep]) / sd[keep]; y = g[target].values; A = np.c_[np.ones(len(Z)), Z] * np.sqrt(w)[:, None]
    beta, *_ = np.linalg.lstsq(A, y * np.sqrt(w), rcond=None)
    pred = np.c_[np.ones(len(Z)), Z] @ beta
    r2 = 1 - np.sum(w * (y - pred) ** 2) / np.sum(w * (y - np.average(y, weights=w)) ** 2)
    return r2, dict(zip(np.array(cols)[keep], beta[1:]))
for (street, kind, position), g in df.groupby(['street', 'kind', 'position']):
    turn = street != 'river'
    hand = [c for c in HAND if turn or c not in ('now', 'drawEq', 'swing', 'variance', 'best', 'up', 'down', 'implied')]
    for target, name in ((('advAgg', 'betting'),) if kind == 'open' else (('advCont', 'continuing'), ('advAgg', 'raising'))):
        x = g[g[target].notna()]
        if len(x) < 200: continue
        if kind != 'open': hand2 = ['edge'] + hand
        else: hand2 = hand
        print(f"== {street} {kind} {position}: what {name} is worth to a hand ({x.did.nunique()} decisions). mean {100*wmean(x[target], x.w):+.2f}% of pot, sd {100*np.sqrt(wmean((x[target]-wmean(x[target],x.w))**2, x.w)):.2f}%")
        print("   one feature at a time (rank correlation): " + ', '.join(f"{c} {corr(x[c], x[target]):+.2f}" for c in hand2 + SOLVED))
        r_hand, b = linear(x, hand2, target)
        print(f"   together, hand features only: R2 {r_hand:.2f}; weights (per SD, % of pot): " + ', '.join(f"{c} {100*v:+.2f}" for c, v in sorted(b.items(), key=lambda t: -abs(t[1]))[:8]))
        r_spot, _ = linear(x, hand2 + SPOT, target)
        # the spot changing what a feature is worth: interactions of the main hand features with the spot
        main = [c for c, _ in sorted(b.items(), key=lambda t: -abs(t[1]))[:4]]
        inter = x.copy(); extra = []
        for c in main:
            for s_ in ('faced', 'spr', 'rangeEq', 'nutShare', 'hisNutShare'):
                inter[f'{c}*{s_}'] = (inter[c] - wmean(inter[c].fillna(0), inter.w)) * (inter[s_] - wmean(inter[s_], inter.w)); extra.append(f'{c}*{s_}')
        r_int, bi = linear(inter, hand2 + SPOT + extra, target)
        r_sol, _ = linear(x, hand2 + SPOT + SOLVED, target)
        print(f"   R2 adding: the spot's features {r_spot:.2f}; spot x hand interactions {r_int:.2f}; his solved answer {r_sol:.2f}")
        print("   strongest interactions: " + ', '.join(f"{c} {100*v:+.2f}" for c, v in sorted(((c, v) for c, v in bi.items() if '*' in c), key=lambda t: -abs(t[1]))[:6]))
        # per decision: does the same feature matter the same everywhere?
        per = []
        for did, y in x.groupby('did'):
            if len(y) < 40: continue
            r = y.iloc[0]
            per.append(dict(faced=r.faced, spr=r.spr, rangeEq=r.rangeEq, nutEdge=r.nutShare - r.hisNutShare, **{c: corr(y[c], y[target]) for c in main}))
        per = pd.DataFrame(per)
        if len(per) > 8:
            print("   per decision, the correlation of each main feature with the advantage (mean, sd), and what that correlation moves with:")
            for c in main:
                print(f"      {c:<10} {per[c].mean():+.2f} (sd {per[c].std():.2f})  moves with: " + ' '.join(f"{s_} {corr(per[s_], per[c]):+.2f}" for s_ in ('faced', 'spr', 'rangeEq', 'nutEdge')))
        print()
