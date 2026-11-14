# Ideas about the spot rather than the hand: when strong hands slow down, what raises are made of.
import sys; sys.path.insert(0, 'research/insight')
from lib import *
import warnings; warnings.filterwarnings('ignore')
d = load(street=3); d['nodraw'] = ~d.fd & ~d.oesd & ~d.gut; U = d[~d.facing]; F = d[d.facing]
def table(data, sel, col, ctx, name, feats):
    x = data[sel(data)]; g = x.groupby('key').apply(lambda y: pd.Series(dict(v=wmean(y, col), w=y.w.sum(), cl=y.spot.iloc[0]))).join(ctx); g = g[g.w > 0.5]
    print(f'  {name} ({len(g)} decisions, mean {g.v.astype(float).mean():.2f})')
    for c in feats:
        if c not in g: continue
        if set(g[c].dropna().unique()) <= {0.0, 1.0}: lo, hi = g[g[c] == 0], g[g[c] == 1]; tag = ('no', 'yes')
        else: m = g[c].median(); lo, hi = g[g[c] <= m], g[g[c] > m]; tag = ('low', 'high')
        if len(lo) < 5 or len(hi) < 5: continue
        a, b = lo.groupby('cl').v.mean().astype(float), hi.groupby('cl').v.mean().astype(float); se = np.sqrt(a.var(ddof=1) / len(a) + b.var(ddof=1) / len(b))
        print(f'      {c:<12} {tag[0]} {a.mean():.2f} ({len(a)})   {tag[1]} {b.mean():.2f} ({len(b)})   t {(b.mean() - a.mean()) / se:+.1f}')
cu, cf = context(U), context(F); FE = ['ip', 'raiser', 'two_tone', 'monotone', 'connected', 'paired', 'high_board', 'low_board', 'spr', 'range_eq', 'he_raises', 'he_folds']; FF = ['ip', 'raiser', 'two_tone', 'monotone', 'connected', 'paired', 'high_board', 'low_board', 'spr', 'range_eq', 'price']
ST = lambda x: x.klass.isin(['set', 'two pair', 'trips', 'straight+'])
print('== Strong hands (two pair or better) =='); table(U, ST, 'bet', cu, 'bet', FE); table(F, ST, 'raise', cf, 'raise facing a bet', FF)
print('== Sets only =='); table(U, lambda x: x.klass == 'set', 'bet', cu, 'bet', FE); table(F, lambda x: x.klass == 'set', 'raise', cf, 'raise facing a bet', FF)
print('== Overpairs =='); table(U, lambda x: x.klass == 'overpair', 'bet', cu, 'bet', FE); table(F, lambda x: x.klass == 'overpair', 'raise', cf, 'raise facing a bet', FF)
print('== Top pair =='); table(U, lambda x: x.klass == 'top pair', 'bet', cu, 'bet', FE); table(F, lambda x: x.klass == 'top pair', 'raise', cf, 'raise facing a bet', FF)
print('== Unpaired, no draw =='); table(U, lambda x: (x.klass == 'no pair') & x.nodraw, 'bet', cu, 'bet', FE); table(F, lambda x: (x.klass == 'no pair') & x.nodraw, 'raise', cf, 'raise facing a bet', FF)
print('== What a flop raise is made of ==')
F2 = F.copy(); F2['kind'] = np.where(F2.klass.isin(['set', 'two pair', 'trips', 'straight+']), 'two pair or better', np.where(F2.klass.isin(['overpair', 'top pair']), 'top pair or overpair', np.where(F2.fd | F2.oesd, 'flush draw or open-ender', np.where(F2.gut, 'gutshot', np.where(F2.klass != 'no pair', 'weaker pair', np.where(F2.bdf | F2.bds, 'nothing but a backdoor draw', 'nothing'))))))
F2['rw'] = F2.w * F2['raise']; tot = F2.groupby('kind').apply(lambda x: pd.Series(dict(share_of_range=x.w.sum(), share_of_raises=x.rw.sum(), raises=x.rw.sum() / x.w.sum())))
tot['share_of_range'] /= tot.share_of_range.sum(); tot['share_of_raises'] /= tot.share_of_raises.sum(); print(tot.sort_values('share_of_raises', ascending=False).round(3).to_string())
print('== What a flop bet is made of, by seat and role ==')
U2 = U.copy(); U2['kind'] = np.where(U2.klass.isin(['set', 'two pair', 'trips', 'straight+']), 'two pair or better', np.where(U2.klass.isin(['overpair', 'top pair']), 'top pair or overpair', np.where(U2.fd | U2.oesd, 'flush draw or open-ender', np.where(U2.gut, 'gutshot', np.where(U2.klass != 'no pair', 'weaker pair', np.where(U2.hi == 12, 'ace high', np.where(U2.bdf | U2.bds, 'nothing but a backdoor draw', 'nothing')))))))
for (ip, pfa), x in U2.groupby(['ip', 'pfa']):
    g = x.groupby('kind').apply(lambda y: wmean(y, 'bet')).round(2).to_dict(); print(f"  {'IP ' if ip else 'OOP'} {'raiser' if pfa else 'caller'} ({x.key.nunique()} decisions): " + ', '.join(f'{k} {v:.2f}' for k, v in sorted(g.items(), key=lambda kv: -kv[1])))
