import json, sys, pandas as pd, numpy as np
d = pd.DataFrame([json.loads(l) for l in open('research/insight/out/play-flop.jsonl')]); print(len(d), 'flop spots:', d.action.value_counts().to_dict(), '| solver itself', round(d.solved.mean(), 3))
both = lambda c: pd.concat([d[c.format('oop')], d[c.format('ip')]])
for k, name in [('derived', 'Derived formulas'), ('equity', 'Old base')]:
    eq = both(k + '_{}_eq'); br = both(k + '_{}'); print(f"{name:<17} gives up to the equilibrium: mean {eq.mean():.2f} median {eq.median():.2f} worst tenth {eq.quantile(0.9):.2f} | out of position {d[k + '_oop_eq'].mean():.2f}, in position {d[k + '_ip_eq'].mean():.2f} | a best response wins {br.mean():.1f}")
print('street by street (derived): ' + ', '.join(f"{s} {both('derived_{}_eq_' + s).mean():.2f}" for s in ['flop', 'turn', 'river']))
print('by seat and street:'); print(pd.DataFrame({seat: {s: d[f'derived_{seat}_eq_{s}'].mean() for s in ['flop', 'turn', 'river']} for seat in ['oop', 'ip']}).round(2).to_string())
print('by pot type:'); print(d.groupby('action').apply(lambda x: pd.Series(dict(n=len(x), spr=x.spr.mean(), derived=(x.derived_oop_eq.mean() + x.derived_ip_eq.mean()) / 2, old=(x.equity_oop_eq.mean() + x.equity_ip_eq.mean()) / 2, flop=(x.derived_oop_eq_flop.mean() + x.derived_ip_eq_flop.mean()) / 2, turn=(x.derived_oop_eq_turn.mean() + x.derived_ip_eq_turn.mean()) / 2, river=(x.derived_oop_eq_river.mean() + x.derived_ip_eq_river.mean()) / 2))).round(2).to_string())
print('derived better than the old base on', f"{((d.derived_oop_eq + d.derived_ip_eq) < (d.equity_oop_eq + d.equity_ip_eq)).mean():.0%}", 'of spots')
