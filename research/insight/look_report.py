import json, sys, pandas as pd
d = pd.DataFrame([json.loads(l) for l in open(sys.argv[1])]); names = [s for s in ['flop', 'turn', 'river'] if f'oop_{s}' in d]
both = pd.concat([d.oop, d.ip]); print(f"{len(d)} spots ({d.action.value_counts().to_dict()}), stack to pot {d.spr.min()}-{d.spr.max()}")
print(f"gives up: mean {both.mean():.2f} median {both.median():.2f} worst tenth {both.quantile(0.9):.2f} worst {both.max():.2f} | out of position {d.oop.mean():.2f}, in position {d.ip.mean():.2f} | " + ', '.join(f"{s} {(d[f'oop_{s}'].mean() + d[f'ip_{s}'].mean()) / 2:.2f}" for s in names) + f" | a best response wins {(d.oop_br.mean() + d.ip_br.mean()) / 2:.1f}")
print('by pot type:', d.groupby('action').apply(lambda x: round((x.oop.mean() + x.ip.mean()) / 2, 2)).to_dict())
st = {}
for r in d.stats:
    for k, g in r.items(): a = st.setdefault(k, [0, 0]); a[0] += g['agree'] * g['n']; a[1] += g['n']
print('same action as the solver (share of the range, by decision):', {k: round(v[0] / v[1], 2) for k, v in sorted(st.items())})
