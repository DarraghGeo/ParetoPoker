"""River: how much of the range sits in groups of hands with the same equity against his range,
and how much of the solver's mixing is mixing of such groups (which the interchange test shows
may be dealt to any of their hands) rather than of single hands."""
import sys, numpy as np, pandas as pd
sys.path.insert(0, 'diagnosis')
from hands_load import load, wmean
df = load(*sys.argv[1:]); df = df[df.street == 'river']
df['key'] = (df['eq'] * 1e4).round()
for (kind, pos), g in df.groupby(['kind', 'position']):
    out = []
    for did, x in g.groupby('did'):
        W = x.w.sum()
        c = x.groupby('key').apply(lambda y: pd.Series(dict(w=y.w.sum(), n=len(y), cont=wmean(y.pCont if kind != 'open' else y.pAgg, y.w), agg=wmean(y.pAgg, y.w), eq=y['eq'].iloc[0])), include_groups=False)
        mixedHands = x.w[((x.pAgg > .05) & (x.pAgg < .95)) | ((x.pCall > .05) & (x.pCall < .95))].sum() / W
        big = c[c.w / W >= 0.03]
        mixedGroups = c.w[((c.cont > .05) & (c.cont < .95)) | ((c['agg'] > .05) & (c['agg'] < .95))].sum() / W
        out.append(dict(groups=len(c), hands=len(x), biggest=c.w.max() / W, inBig=big.w.sum() / W, mixedHands=mixedHands, mixedGroups=mixedGroups,
                        mixedBig=big.w[((big.cont > .05) & (big.cont < .95)) | ((big['agg'] > .05) & (big['agg'] < .95))].sum() / W))
    t = pd.DataFrame(out)
    print(f"{kind} {pos}: {len(t)} decisions; {t.hands.mean():.0f} hands in {t.groups.mean():.0f} distinct equities; biggest tied group {t.biggest.mean():.2f} of the range; in tied groups of 3%+ of the range {t.inBig.mean():.2f}")
    print(f"     share of the range the solver mixes, hand by hand {t.mixedHands.mean():.2f}; still mixed once tied hands are pooled {t.mixedGroups.mean():.2f}; of which in the big tied groups {t.mixedBig.mean():.2f}")
