# Do value hands choose their bet size by what they can still draw to?
import sys, json, pandas as pd, numpy as np
street = sys.argv[1]
d = pd.read_json(f'research/proof/out/valuesize-{street}.jsonl', lines=True)
d['key'] = d.spot + '|' + d.seat.astype(str)
# size as a position between the spot's smallest and largest bet (0 = always the smallest, 1 = always the largest)
d['pos'] = (d['size'] - d.low) / (d.top - d.low)
has = lambda t: d.tags.apply(lambda x: t in x)
for t in ['Backdoor flush draw', 'Backdoor straight draw', 'Flush draw', 'Open-ended straight draw', 'Gutshot']: d[t] = has(t)
d['made'] = d.tags.apply(lambda x: x[0])
print(f'\n===== {street}: {len(d):,} hands, {d.key.nunique()} decisions')
v = d[(d.now >= 0.6) & (d.bet >= 0.5)].copy()   # value hands: ahead of most of his range now, and betting
print(f'value hands (beat 60%+ of his range now, bet at least half the time): {len(v):,}')
def wavg(x, col): 
    x = x[x[col].notna()]; return (x.w * x.bet * x[col]).sum() / (x.w * x.bet).sum() if len(x) else np.nan
# 1. by strength now and by draw equity: where on the size scale, and how often they check
v['strength'] = pd.cut(v.now, [0.6, 0.75, 0.9, 1.01], labels=['medium-strong 60-75', 'strong 75-90', 'very strong 90+'], right=False)
allv = d[d.now >= 0.6].copy(); allv['strength'] = pd.cut(allv.now, [0.6, 0.75, 0.9, 1.01], labels=['medium-strong 60-75', 'strong 75-90', 'very strong 90+'], right=False)
allv['dq'] = pd.cut(allv.draw, [-1, 0.02, 0.06, 1], labels=['draw equity under 2%', '2-6%', 'over 6%'])
v['dq'] = pd.cut(v.draw, [-1, 0.02, 0.06, 1], labels=['draw equity under 2%', '2-6%', 'over 6%'])
print('\nBy how strong the hand is now, and how much draw equity it has: size position (0 smallest bet, 1 largest), share of bets at the largest size, and how often it checks')
for s_ in ['medium-strong 60-75', 'strong 75-90', 'very strong 90+']:
    for q in ['draw equity under 2%', '2-6%', 'over 6%']:
        x = v[(v.strength == s_) & (v.dq == q)]; a = allv[(allv.strength == s_) & (allv.dq == q)]
        if a.w.sum() < 60: continue
        print(f"  {s_:<20} {q:<22} weight {a.w.sum():7.0f}   size {wavg(x,'pos'):5.2f}   largest {wavg(x,'big'):4.0%}   smallest {wavg(x,'small'):4.0%}   checks {1 - (a.w*a.bet).sum()/a.w.sum():4.0%}")
# 2. the same made hand, in the same decision, with and without a feature: paired across decisions
print('\nSame made hand in the same decision, with the feature against without: difference in size position and in checking, averaged over decisions (t)')
for feat in ['Backdoor flush draw', 'Backdoor straight draw', 'Flush draw', 'Open-ended straight draw', 'Gutshot']:
    if not d[feat].any(): continue
    for made in ['Top pair', 'Overpair', 'Middle pair', 'Two pair', 'Set']:
        rows = []
        for key, x in d[(d.made == made)].groupby('key'):
            a, b = x[x[feat]], x[~x[feat]]
            if a.w.sum() < 2 or b.w.sum() < 2: continue
            pa, pb = wavg(a[a.bet > 0.02], 'pos'), wavg(b[b.bet > 0.02], 'pos')
            ca, cb = 1 - (a.w*a.bet).sum()/a.w.sum(), 1 - (b.w*b.bet).sum()/b.w.sum()
            rows.append((pa - pb, ca - cb, (a.w*a.e).sum()/a.w.sum() - (b.w*b.e).sum()/b.w.sum()))
        r = pd.DataFrame(rows, columns=['size', 'check', 'eq']).dropna()
        if len(r) < 6: continue
        t = lambda c: r[c].mean() / (r[c].std(ddof=1) / np.sqrt(len(r)))
        print(f"  {made:<12} with {feat:<24} decisions {len(r):3d}   size {r['size'].mean():+.3f} (t {t('size'):+.1f})   checks {r['check'].mean():+.1%} (t {t('check'):+.1f})   equity {r['eq'].mean():+.1%}")
# 3. controlling for equity: within a decision and five-point equity bins, does draw equity move the size?
x = v[v.pos.notna()].copy(); x['bin'] = (x.e * 20).astype(int)
x['ww'] = x.w * x.bet
g = x.groupby(['key', 'bin'])
x['pos_c'] = x.pos - g.apply(lambda q: pd.Series((q.ww * q.pos).sum() / q.ww.sum(), index=q.index), include_groups=False).reset_index(level=[0, 1], drop=True)
x['draw_c'] = x.draw - g.apply(lambda q: pd.Series((q.ww * q.draw).sum() / q.ww.sum(), index=q.index), include_groups=False).reset_index(level=[0, 1], drop=True)
slope = (x.ww * x.pos_c * x.draw_c).sum() / (x.ww * x.draw_c ** 2).sum()
corr = (x.ww * x.pos_c * x.draw_c).sum() / np.sqrt((x.ww * x.pos_c ** 2).sum() * (x.ww * x.draw_c ** 2).sum())
print(f"\nAmong value hands of the same equity in the same decision: each extra 10 points of draw equity moves the size position by {slope*0.1:+.3f} (correlation {corr:+.2f})")
json.dump({'street': street, 'hands': int(len(d)), 'decisions': int(d.key.nunique()), 'slope_per_10_points': round(float(slope) * 0.1, 4), 'correlation': round(float(corr), 3)}, open(f'research/proof/out/valuesize-{street}.json', 'w'))
