# Backdoor straights told apart by how many runner-runner ways they have: three in a row (3 ways) against gapped (1-2), each against none.
import json, pandas as pd, numpy as np
import glob
d = pd.concat([pd.read_json(f, lines=True) for f in sorted(glob.glob('research/proof/out/valuesize-flop*.jsonl'))], ignore_index=True)
d['key'] = d.spot + '|' + d.seat.astype(str); d['pos'] = (d['size'] - d.low) / (d.top - d.low); d['made'] = d.tags.apply(lambda x: x[0])
d['bdf'] = d.tags.apply(lambda x: 'Backdoor flush draw' in x)
def wavg(x, col):
    x = x[x[col].notna()]; return (x.w * x.bet * x[col]).sum() / (x.w * x.bet).sum() if len(x) and (x.w * x.bet).sum() > 0 else np.nan
print(f'flop: {len(d):,} hands, {d.key.nunique()} decisions; hands by runner-runner straight ways:', d.groupby('ways').w.sum().round(0).to_dict())
out = []
full = d
for scope, d in [('all hands', full), ('hands with no backdoor flush draw', full[~full.bdf])]:
 print(f'\n-- {scope}')
 for label, pick in [('three in a row (3 ways)', lambda x: x.ways >= 3), ('gapped, 2 ways', lambda x: x.ways == 2), ('gapped, 1 way', lambda x: x.ways == 1), ('any (1+ ways)', lambda x: x.ways >= 1)]:
     for made in ['Top pair', 'Overpair', 'Middle pair', 'Bottom pair', 'Set']:
         rows = []
         for key, x in d[d.made == made].groupby('key'):
             a, b = x[pick(x)], x[x.ways == 0]
             if a.w.sum() < 1.5 or b.w.sum() < 1.5: continue
             rows.append((wavg(a[a.bet > 0.02], 'pos') - wavg(b[b.bet > 0.02], 'pos'), (1 - (a.w*a.bet).sum()/a.w.sum()) - (1 - (b.w*b.bet).sum()/b.w.sum()), (a.w*a.e).sum()/a.w.sum() - (b.w*b.e).sum()/b.w.sum(), (a.w*a.bdf).sum()/a.w.sum() - (b.w*b.bdf).sum()/b.w.sum()))
         r = pd.DataFrame(rows, columns=['size', 'check', 'eq', 'bdf'])
         if len(r) < 5: continue
         t = lambda c: (r[c].dropna().mean() / (r[c].dropna().std(ddof=1) / np.sqrt(len(r[c].dropna())))) if len(r[c].dropna()) > 2 else float('nan')
         print(f"  {made:<12} {label:<24} decisions {len(r):3d}   size {r['size'].mean():+.3f} (t {t('size'):+.1f})   checks {r['check'].mean():+.1%} (t {t('check'):+.1f})   equity {r['eq'].mean():+.1%}   backdoor flush share {r['bdf'].mean():+.0%}")
         out.append({'scope': scope, 'made': made, 'group': label, 'decisions': int(len(r)), 'size': round(float(r['size'].mean()), 3), 't_size': round(float(t('size')), 1), 'checks': round(float(r['check'].mean()), 3), 't_checks': round(float(t('check')), 1)})
json.dump(out, open('research/proof/out/valuesize-straights.json', 'w'))
