# Twins: the same two ranks in the same decision, one holding with a backdoor flush draw and one without.
# Nothing differs but the suit, so whatever the solver does differently, the backdoor draw is the reason.
import sys; sys.path.insert(0, 'research/insight')
from lib import *
import warnings; warnings.filterwarnings('ignore')
d = load(street=3); d['size_pos'] = (d['size'] - d.smin) / (d.smax - d.smin); d['nodraw'] = ~d.fd & ~d.oesd & ~d.gut; d['over_real'] = d.v - d.e
d = d[d.nodraw]; U = d[~d.facing]; F = d[d.facing]; ctx = {'U': context(U), 'F': context(F)}
BY = ['key', 'hi', 'lo', 'suited']
def twin(title, data, klasses, cols, A=lambda x: x.bdf, B=lambda x: ~x.bdf, mods=None, extra=None):
    x = data[data.klass.isin(klasses)]; x = x[extra(x)] if extra else x
    r = paired(x, A, B, cols, by=BY, min_w=0.02); out = verdict(r, cols, title)
    if mods and len(r) > 20:
        g = r.groupby('key')[cols].mean().reset_index()
        for c in mods: moderators(g, ctx['U' if data is U else 'F'], c, top=3)
    return r
C = ['bet', 'size_pos', 'over_real', 'e']; G = ['fold', 'call', 'raise', 'e']
print(f'{d.spot.nunique()} flops\n== Betting ==')
for k in [['top pair'], ['overpair'], ['middle pair'], ['bottom pair'], ['pocket below top'], ['underpair'], ['no pair'], ['set', 'two pair']]:
    twin(f'{"/".join(k)}: backdoor flush v its twin', U, k, C, mods=['bet', 'size_pos'] if k[0] in ('top pair', 'overpair', 'no pair') else None)
twin('top pair, nut or second-nut backdoor v its twin', U, ['top pair'], C, A=lambda x: x.bdf & (x.bdf_nut <= 1))
twin('top pair, lower backdoor v its twin', U, ['top pair'], C, A=lambda x: x.bdf & (x.bdf_nut > 1))
twin('overpair, nut or second-nut backdoor v its twin', U, ['overpair'], C, A=lambda x: x.bdf & (x.bdf_nut <= 1))
twin('overpair, lower backdoor v its twin', U, ['overpair'], C, A=lambda x: x.bdf & (x.bdf_nut > 1))
twin('no pair, ace high: backdoor v its twin', U, ['no pair'], C, extra=lambda x: x.hi == 12)
twin('no pair, king high or lower: backdoor v its twin', U, ['no pair'], C, extra=lambda x: x.hi < 12)
print('== Facing a bet ==')
for k in [['top pair'], ['overpair'], ['middle pair'], ['bottom pair'], ['pocket below top'], ['underpair'], ['no pair'], ['set', 'two pair']]:
    twin(f'{"/".join(k)}: backdoor flush v its twin', F, k, G, mods=['fold', 'raise'] if k[0] in ('top pair', 'no pair', 'middle pair') else None)
twin('no pair, ace high: backdoor v its twin', F, ['no pair'], G, extra=lambda x: x.hi == 12)
twin('no pair, king high or lower: backdoor v its twin', F, ['no pair'], G, extra=lambda x: x.hi < 12)
twin('no pair: backdoor with both cards v with one card (two of the suit on board)', F, ['no pair'], G, A=lambda x: x.bdf & x.bdf_two, B=lambda x: x.bdf & ~x.bdf_two)
print('== Flush draw against its twin with only the backdoor, and against its twin with nothing (flop) ==')
e = load(street=3); e['size_pos'] = (e['size'] - e.smin) / (e.smax - e.smin); e['over_real'] = e.v - e.e; e = e[~e.oesd & ~e.gut]; EU = e[~e.facing]; EF = e[e.facing]
for k in [['no pair'], ['top pair'], ['middle pair', 'bottom pair'], ['overpair']]:
    for data, cols, name in [(EU, C, 'bets'), (EF, G, 'faces a bet')]:
        x = data[data.klass.isin(k)]; verdict(paired(x, lambda x: x.fd, lambda x: ~x.fd, cols, by=BY, min_w=0.02), cols, f'{"/".join(k)} {name}: flush draw v twin without')
print('== Turn twins: the same ranks with a flush draw and without ==')
t = load(street=4); who = t.line.str.split('|').str[0].str.replace(r'\d', '', regex=True); pos = t.line.str.split('|').str[1]; t = t[~t.oesd & ~t.gut]
for name, sel in [('second barrel', ((who == 'bc') & (pos == 'first')) | ((who == 'xbc') & (pos == 'x'))), ('delayed bet', (who == 'xx') & (pos == 'x')), ('probe', (who == 'xx') & (pos == 'first'))]:
    for k in [['no pair'], ['top pair'], ['middle pair', 'bottom pair', 'pocket below top'], ['overpair'], ['set', 'two pair']]:
        x = t[sel.reindex(t.index) & t.klass.isin(k)]; verdict(paired(x, lambda x: x.fd, lambda x: ~x.fd, ['bet', 'e'], by=BY, min_w=0.02), ['bet', 'e'], f'{name}, {"/".join(k)}: flush draw v twin without')
    x = t[sel.reindex(t.index) & (t.klass == 'no pair') & ~t.fd]; verdict(paired(x, lambda x: x.blocker_fd == True, lambda x: x.blocker_fd == False, ['bet', 'e'], by=BY, min_w=0.02), ['bet', 'e'], f'{name}, no pair no draw: ace or king of the flush suit v twin without')
