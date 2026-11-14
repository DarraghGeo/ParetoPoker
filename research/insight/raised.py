# The bettor facing a raise of their flop bet: which hands are comfortable, which are in trouble.
import sys; sys.path.insert(0, 'research/insight')
from lib import *
import warnings; warnings.filterwarnings('ignore')
d = load(street=3, raised=True)
if not len(d): print('no decisions yet'); sys.exit()
d['nodraw'] = ~d.fd & ~d.oesd & ~d.gut; print(f'{d.spot.nunique()} flops, {d.key.nunique()} decisions facing a raise')
g = d.groupby('klass').apply(lambda x: pd.Series(dict(share=x.w.sum(), eq=wmean(x, 'e'), fold=wmean(x, 'fold'), call=wmean(x, 'call'), reraise=wmean(x, 'raise')))); g['share'] /= g.share.sum(); print(g.sort_values('eq').round(2).to_string())
G = ['fold', 'call', 'raise', 'e']; BY = ['key', 'hi', 'lo', 'suited']; x = d[d.nodraw]
for k in [['top pair'], ['overpair'], ['middle pair', 'bottom pair', 'pocket below top'], ['no pair'], ['set', 'two pair']]:
    verdict(paired(x[x.klass.isin(k)], lambda x: x.bdf, lambda x: ~x.bdf, G, by=BY, min_w=0.02), G, f'{"/".join(k)}: backdoor flush v its twin')
verdict(paired(d, lambda x: (x.klass == 'top pair') & (x.kick_rank <= 1), lambda x: (x.klass == 'top pair') & (x.kick_rank > 1), G), G, 'top pair: best two kickers v the rest')
verdict(paired(d, lambda x: (x.klass == 'overpair') & (x.hi - x.board_top <= 2), lambda x: (x.klass == 'overpair') & (x.hi - x.board_top > 2), G), G, 'overpair: low v high')
verdict(paired(d, lambda x: (x.klass == 'no pair') & x.fd, lambda x: (x.klass == 'no pair') & x.gut & ~x.fd, G), G, 'flush draw v gutshot')
