# Concrete hands for the write-up: twins on real boards, with what each does.
import sys; sys.path.insert(0, 'research/insight')
from lib import *
import warnings; warnings.filterwarnings('ignore')
d = load(street=3); d['nodraw'] = ~d.fd & ~d.oesd & ~d.gut; d['worth'] = d.v
def show(title, data, klass, col, want, n=4, extra=None):
    print(f'\n{title}'); x = data[(data.klass == klass) & data.nodraw]; x = x[extra(x)] if extra else x; rows = []
    for (key, hi, lo, su), g in x.groupby(['key', 'hi', 'lo', 'suited']):
        a, b = g[g.bdf], g[~g.bdf]
        if a.w.sum() < 0.3 or b.w.sum() < 0.3: continue
        rows.append((wmean(a, col) - wmean(b, col), key, a.sort_values('w').iloc[-1], b.sort_values('w').iloc[-1], wmean(a, col), wmean(b, col), wmean(a, 'e'), wmean(b, 'e'), wmean(a, 'worth'), wmean(b, 'worth')))
    rows.sort(key=lambda r: r[0] * want, reverse=True); mid = rows[len(rows) // 6: len(rows) // 6 + n]   # typical-to-clear cases, not the extreme ones
    for diff, key, a, b, va, vb, ea, eb, wa, wb in mid:
        print(f"  {a.pre:<12} {a.board}  {'IP' if a.ip else 'OOP'} {a.line or 'first':<6} {a.hand} {col} {va:.0%} (equity {ea:.0%}, worth {wa:.2f} pots)   v   {b.hand} {col} {vb:.0%} (equity {eb:.0%}, worth {wb:.2f} pots)" if not np.isnan(wa) else f"  {a.pre:<12} {a.board}  {'IP' if a.ip else 'OOP'} {a.line:<6} {a.hand} {col} {va:.0%} (equity {ea:.0%})   v   {b.hand} {col} {vb:.0%} (equity {eb:.0%})")
U = d[~d.facing]; F = d[d.facing]
show('Middle pair facing a bet: folds less with the backdoor', F, 'middle pair', 'fold', -1)
show('Pocket pair below top pair facing a bet', F, 'pocket below top', 'fold', -1)
show('Unpaired facing a bet', F, 'no pair', 'fold', -1)
show('Top pair facing a bet: calls more', F, 'top pair', 'call', 1)
show('Set or two pair facing a bet: raises less', F, 'set', 'raise', -1)
show('Top pair betting: worth more', U, 'top pair', 'bet', -1)
