import json, sys, pandas as pd
L = lambda t: pd.DataFrame([json.loads(l) for l in open(f'research/insight/out/play-full-{t}.jsonl')])
for t in sys.argv[1:]:
    d = L(t); print(f"{t:<22} n {len(d)} gives up oop {d.derived_oop_eq.mean():.2f} ip {d.derived_ip_eq.mean():.2f} mean {(d.derived_oop_eq.mean() + d.derived_ip_eq.mean()) / 2:.2f} median {pd.concat([d.derived_oop_eq, d.derived_ip_eq]).median():.2f} worst {pd.concat([d.derived_oop_eq, d.derived_ip_eq]).max():.1f} | turn {((d.derived_oop_eq_turn + d.derived_ip_eq_turn) / 2).mean():.2f} river {((d.derived_oop_eq_river + d.derived_ip_eq_river) / 2).mean():.2f} | best response {(d.derived_oop.mean() + d.derived_ip.mean()) / 2:.0f}")
