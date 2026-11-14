# Reads out/buckets-<street>.jsonl and asks: do hand types bet at their own rates, and does the type say more than equity does?
import sys, json, pandas as pd, numpy as np
street = sys.argv[1]
d = pd.read_json(f'research/proof/out/buckets-{street}.jsonl', lines=True).rename(columns={'eq': 'e'})
d['wb'] = d.w * d.bet
print(f'\n===== {street}: {len(d):,} hands, {d.spot.nunique()} spots, range bets {d.wb.sum()/d.w.sum():.0%} overall')
# 1. each type: how much of the range, its equity, how often it bets, and how consistent that is from spot to spot
g = d.groupby('name')
per_spot = d.groupby(['name', 'spot']).apply(lambda x: pd.Series({'bet': x.wb.sum() / x.w.sum(), 'w': x.w.sum()}), include_groups=False).reset_index()
rows = []
for name, x in g:
    ps = per_spot[(per_spot.name == name) & (per_spot.w > 1.5)]
    rows.append({'type': name, 'share': x.w.sum() / d.w.sum(), 'equity': (x.w * x.e).sum() / x.w.sum(), 'bets': x.wb.sum() / x.w.sum(), 'spots': len(ps), 'q25': ps.bet.quantile(.25) if len(ps) else np.nan, 'q75': ps.bet.quantile(.75) if len(ps) else np.nan})
t = pd.DataFrame(rows).sort_values('equity')
print('\nEach type (weakest first): share of range, average equity, how often it bets, and the middle half of spots')
for _, r in t.iterrows(): print(f"  {r.type:<34} {r.share:5.1%} of range  equity {r.equity:4.0%}  bets {r.bets:4.0%}   (spots {int(r.spots):3d}: {r.q25:4.0%} to {r.q75:4.0%})")
# 2. the hands that are behind (equity under 45%): among them, which types do the bluffing, at the same equity?
b = d[d.e < 0.45].copy(); b['band'] = pd.cut(b.e, [0, .1, .2, .3, .45], labels=['0-10', '10-20', '20-30', '30-45'])
print('\nBehind hands only, by equity band: how often each type bets (types with enough weight)')
piv = b.groupby(['name', 'band'], observed=True).apply(lambda x: pd.Series({'bet': x.wb.sum() / x.w.sum(), 'w': x.w.sum()}), include_groups=False).reset_index()
tot = b.groupby('band', observed=True).apply(lambda x: x.wb.sum() / x.w.sum(), include_groups=False)
print('  ' + 'all behind hands'.ljust(34) + ''.join(f'{band}: {tot.get(band, float("nan")):4.0%}    ' for band in ['0-10', '10-20', '20-30', '30-45']))
for name in t.type:
    sub = piv[piv.name == name]; cells = []
    for band in ['0-10', '10-20', '20-30', '30-45']:
        r = sub[sub.band == band]; cells.append(f"{band}: {r.bet.iloc[0]:4.0%}    " if len(r) and r.w.iloc[0] > 40 else f"{band}:   -     ")
    if any('%' in c for c in cells): print('  ' + name.ljust(34) + ''.join(cells))
# 3. does the type say more than equity? Variance of a hand's betting rate explained by fine equity bins, then by equity bins and type together
d['bin'] = (d.e * 20).astype(int)
def explained(keys):
    m = d.groupby(keys).apply(lambda x: x.wb.sum() / x.w.sum(), include_groups=False).rename('p').reset_index(); x = d.merge(m, on=keys)
    mean = d.wb.sum() / d.w.sum(); return 1 - (x.w * (x.bet - x.p) ** 2).sum() / (d.w * (d.bet - mean) ** 2).sum()
summary = {'street': street, 'hands': int(len(d)), 'spots': int(d.spot.nunique()), 'types': [{'type': r.type, 'share': round(float(r.share), 4), 'equity': round(float(r.equity), 3), 'bets': round(float(r.bets), 3)} for _, r in t.iterrows()], 'behind': {name: {str(b_): round(float(x.bet.iloc[0]), 3) for b_ in ['0-10', '10-20', '20-30', '30-45'] for x in [piv[(piv.name == name) & (piv.band == b_)]] if len(x) and x.w.iloc[0] > 40} for name in t.type}, 'explained': {'equityInSpot': round(float(explained(['spot','seat','bin'])), 3), 'equityAndTypeInSpot': round(float(explained(['spot','seat','bin','name'])), 3)}}
print(f"\nHow much of the betting rate is accounted for:  equity alone (20 bins) {explained(['bin']):.0%}   type alone {explained(['name']):.0%}   equity and type {explained(['bin','name']):.0%}   equity within each spot {explained(['spot','seat','bin']):.0%}   equity and type within each spot {explained(['spot','seat','bin','name']):.0%}")
if street != 'flop':
    # 4. blockers: among air (equity under 15%), do the hands that bet face more folds than the ones that give up?
    a = d[(d.e < 0.15) & d.folds.notna()].copy(); a['rel'] = a.folds - a.groupby(['spot', 'seat']).folds.transform('mean')
    a['q'] = pd.qcut(a.rel, 4, labels=['fewest folds', 'fewer', 'more', 'most folds'])
    r = a.groupby('q', observed=True).apply(lambda x: pd.Series({'bets': x.wb.sum() / x.w.sum(), 'folds_vs_avg': (x.w * x.rel).sum() / x.w.sum()}), include_groups=False)
    print('\nThe weakest hands (equity under 15%), split by how often he folds to them compared with their spot\'s average:')
    for k, x in r.iterrows(): print(f"  {k:<14} he folds {x.folds_vs_avg:+.1%} against them   they bet {x.bets:4.0%}")
    summary['blockers'] = [{'group': str(k), 'folds': round(float(x.folds_vs_avg), 4), 'bets': round(float(x.bets), 3)} for k, x in r.iterrows()]
json.dump(summary, open(f'research/proof/out/buckets-{street}.json', 'w'))
