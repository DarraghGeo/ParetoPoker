import json, sys, numpy as np, pandas as pd
def load(path):
    rows = []
    for l in open(path):
        r = json.loads(l)
        for who, other, noraise in [('oop', 'ip', 'noRaiseIp'), ('ip', 'oop', 'noRaiseOop')]:
            b = r['base'].get(who)
            if b is None: continue
            g = lambda k: (r.get(k) or {}).get(who)
            rows.append(dict(spot=r['spot'], action=r['action'], board=r['board'], who=who, spr=r['spr'], bet=b, mine=r['strong'][who], his=r['strong'][other], noRaise=g(noraise), noStab=g('noStab') if who == 'oop' else None, heLess=g(other + 'LessStrong'), weLess=g(who + 'LessStrong'), shallow=g('shallow'), deep=g('deep')))
    return pd.DataFrame(rows)
for path in sys.argv[1:]:
    d = load(path); print(f'\n{path}: {len(d)} decisions on {d.board.nunique()} boards; bet frequency mean {d.bet.mean():.2f}')
    for k, name in [('noRaise', 'he may not raise'), ('noStab', 'he may not bet when checked to'), ('heLess', 'his strongest fifth removed'), ('weLess', 'our strongest fifth removed'), ('shallow', 'half the stack'), ('deep', 'twice the stack')]:
        x = d[d[k].notna()]; ch = x[k] - x.bet
        if not len(x): continue
        print(f"  {name:<32} n {len(x):3d}  bet changes by {ch.mean():+.3f} on average (median {ch.median():+.3f}); up by 5+ points in {(ch >= 0.05).mean():.0%}, down by 5+ in {(ch <= -0.05).mean():.0%}, within 5 in {(ch.abs() < 0.05).mean():.0%}; biggest moves {ch.min():+.2f} / {ch.max():+.2f}")
    # who holds the strong hands, against how much the range bets
    d['adv'] = d.mine - d.his; print('  bet frequency by who holds the strong hands (65%+ equity), ours less his:')
    for lo, hi, name in [(-1, -0.1, 'he has clearly more'), (-0.1, -0.03, 'he has a little more'), (-0.03, 0.03, 'level'), (0.03, 0.1, 'we have a little more'), (0.1, 1, 'we have clearly more')]:
        x = d[(d.adv > lo) & (d.adv <= hi)]
        if len(x): print(f"     {name:<22} n {len(x):3d}  bets {x.bet.mean():.2f} (quartiles {x.bet.quantile(0.25):.2f}-{x.bet.quantile(0.75):.2f}); bets under 30% in {(x.bet < 0.3).mean():.0%}, over 60% in {(x.bet > 0.6).mean():.0%}")
    print('  correlation of bet frequency with strong-hand advantage:', round(np.corrcoef(d.adv, d.bet)[0, 1], 2), '| by seat:', {w: round(np.corrcoef(x.adv, x.bet)[0, 1], 2) for w, x in d.groupby('who')})
