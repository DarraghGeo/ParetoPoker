import json, sys, pandas as pd
L = lambda t: pd.DataFrame([json.loads(l) for l in open(f'research/insight/out/play-full-{t}.jsonl')])
base = L(sys.argv[1]); tags = sys.argv[2:]; frames = {t: L(t) for t in tags}; n = min(len(f) for f in frames.values()); base = base.iloc[:n]
assert all((frames[t].board.iloc[:n].values == base.board.values).all() for t in tags)
both = lambda d, c: (d[c.format('oop')].mean() + d[c.format('ip')].mean()) / 2
print(n, 'spots:', base.action.value_counts().to_dict())
for t, d in [(sys.argv[1], base)] + [(t, frames[t].iloc[:n]) for t in tags]:
    print(f"{t:<12} gives up {both(d, 'derived_{}_eq'):.2f} (median {pd.concat([d.derived_oop_eq, d.derived_ip_eq]).median():.2f}) = flop {both(d, 'derived_{}_eq_flop'):.2f} + turn {both(d, 'derived_{}_eq_turn'):.2f} + river {both(d, 'derived_{}_eq_river'):.2f} | by pot type " + ', '.join(f"{a} {(x.derived_oop_eq.mean() + x.derived_ip_eq.mean()) / 2:.1f}" for a, x in d.groupby('action')))
