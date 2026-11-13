"""Turn: what the spot changes. Per decision: the equity a hand needs above the pot odds to
continue (hands with no draw, and draws), and how often each kind of hand bets first to act;
then how those move with the spot (rank correlation across decisions)."""
import sys, numpy as np, pandas as pd
sys.path.insert(0, 'diagnosis')
from hands_load import load, wmean
from scipy.stats import spearmanr
df = load(*sys.argv[1:]); df = df[df.street == 'turn'].copy()
df['odds'] = df.faced / (1 + 2 * df.faced); df['edge'] = df['eq'] - df.odds
SPOT = ['faced', 'spr', 'rangeEq', 'nutEdge', 'airShare', 'hisAirShare', 'fAgg', 'fCall']
def cut(x):
    # the edge that best separates continuing from folding
    if len(x) < 8: return np.nan
    x = x.sort_values('edge'); w = x.w.values; p = x.pCont.values; e = x.edge.values
    best, at = 1e18, np.nan
    for k in range(len(x) + 1):
        err = (w[:k] * p[:k]).sum() + (w[k:] * (1 - p[k:])).sum()
        if err < best: best, at = err, (e[k] if k < len(x) else e[-1])
    return at
def sp(a, b):
    ok = a.notna() & b.notna()
    return spearmanr(a[ok], b[ok])[0] if ok.sum() > 8 else np.nan
print("== Facing a bet or raise: the edge over the pot odds a hand needs to continue")
for (kind, pos), g in df[df.kind != 'open'].groupby(['kind', 'position']):
    rows = []
    for did, x in g.groupby('did'):
        r = x.iloc[0]
        rows.append(dict(faced=r.faced, spr=r.spr, rangeEq=r.rangeEq, nutEdge=r.nutShare - r.hisNutShare, airShare=r.airShare, hisAirShare=r.hisAirShare, fAgg=r.fAgg, fCall=r.fCall, pair=r['pair'],
                         made=cut(x[x.draw == 0]), draws=cut(x[x.draw >= 2]), all=cut(x)))
    t = pd.DataFrame(rows)
    print(f" {kind} {pos} ({len(t)} decisions): no-draw hands need +{100*t.made.mean():.0f} points (sd {100*t.made.std():.0f}); strong and nut draws {100*t.draws.mean():+.0f} (sd {100*t.draws.std():.0f}); all hands {100*t['all'].mean():+.0f}")
    for c in ('made', 'draws'):
        print(f"     {c:<6} moves with: " + ' '.join(f"{s_} {sp(t[s_], t[c]):+.2f}" for s_ in SPOT))
    print("     by pair of ranges, no-draw hands: " + ' | '.join(f"{p}: +{100*x.made.mean():.0f}" for p, x in t.groupby('pair')))
print("\n== First to act: how often each kind bets, relative to the range, and what moves it")
df['nowBand'] = pd.cut(df.rankNow, [0, .2, .6, .8, 1.0001], labels=['weak', 'middle', 'good', 'top'], right=False)
for pos, g in df[df.kind == 'open'].groupby('position'):
    rows = []
    for did, x in g.groupby('did'):
        r = x.iloc[0]; row = dict(spr=r.spr, rangeEq=r.rangeEq, nutEdge=r.nutShare - r.hisNutShare, airShare=r.airShare, hisAirShare=r.hisAirShare, fAgg=r.fAgg, pair=r['pair'])
        for b, y in x[x.draw == 0].groupby('nowBand', observed=True): row[f'{b}'] = wmean(y.pAgg, y.w)
        d = x[x.draw >= 2]; row['draws'] = wmean(d.pAgg, d.w) if len(d) > 3 else np.nan
        opt = x.w[x.aggStatus == 'optional'].sum() / x.w.sum(); row['optional'] = opt
        rows.append(row)
    t = pd.DataFrame(rows)
    print(f" {pos} ({len(t)} decisions): range bets {t.fAgg.mean():.2f} (sd {t.fAgg.std():.2f}); share of the range that is optional {t.optional.mean():.2f} (sd {t.optional.std():.2f})")
    for c in ('weak', 'middle', 'good', 'top', 'draws', 'optional'):
        print(f"     {c:<8} bets {t[c].mean():.2f} (sd {t[c].std():.2f}); moves with: " + ' '.join(f"{s_} {sp(t[s_], t[c]):+.2f}" for s_ in ('fAgg', 'spr', 'rangeEq', 'nutEdge', 'airShare', 'hisAirShare')))
    print("     by pair of ranges: " + ' | '.join(f"{p}: bets {x.fAgg.mean():.2f}, top {x.top.mean():.2f}, draws {x.draws.mean():.2f}, weak {x.weak.mean():.2f}" for p, x in t.groupby('pair')))
