# The hunt: each line is an idea a player would say out loud, put as hands A against hands B inside the same decision.
# Differences are A minus B, averaged over flops; t is over flops; the percentage is the share of flops with that sign.
import sys; sys.path.insert(0, 'research/insight')
from lib import *
import pickle, os
d = load(street=3); d['size_pos'] = (d['size'] - d.smin) / (d.smax - d.smin)
d['nobd'] = ~d.bdf & (d.ways < 2); d['nodraw'] = ~d.fd & ~d.oesd & ~d.gut
print(f'{len(d):,} hands, {d.key.nunique()} decisions on {d.spot.nunique()} flops\n')
U = d[~d.facing]; F = d[d.facing]
C = ['bet', 'size_pos', 'e']; G = ['fold', 'call', 'raise', 'e']
def T(title, data, A, B, cols=None, match=None, **k): return verdict(paired(data, A, B, cols or (C if data is U or 'bet' in (cols or C) else G), match=match, **k), cols or C, title)
def both(title, A, B, match=None, base=None):
    """The same question in every seat and role: betting first or after a check, and facing a bet."""
    for name, data, cols in [('bets: ', U if base is None else U[base(U)], C), ('faces a bet: ', F if base is None else F[base(F)], G)]:
        verdict(paired(data, A, B, cols, match=match), cols, name + title)
kl = lambda *names: (lambda x: x.klass.isin(names))
print('== Backdoor flush draws ==')
for k in ['top pair', 'overpair', 'middle pair', 'bottom pair', 'pocket below top', 'underpair', 'no pair', 'two pair', 'set']:
    both(f'{k}: backdoor flush v none', lambda x, k=k: (x.klass == k) & x.bdf & x.nodraw, lambda x, k=k: (x.klass == k) & ~x.bdf & x.nodraw)
print('== Backdoor straight draws (two or more runner-runner ways) ==')
for k in ['top pair', 'middle pair', 'bottom pair', 'no pair']:
    both(f'{k}: backdoor straight v none', lambda x, k=k: (x.klass == k) & x.bds & ~x.bdf & x.nodraw, lambda x, k=k: (x.klass == k) & (x.ways == 0) & ~x.bdf & x.nodraw)
print('== Kickers (top pair) ==')
both('top pair: best two kickers v the rest', lambda x: (x.klass == 'top pair') & (x.kick_rank <= 1), lambda x: (x.klass == 'top pair') & (x.kick_rank > 1))
both('top pair: kicker over the board v under', lambda x: (x.klass == 'top pair') & x.kick_over, lambda x: (x.klass == 'top pair') & ~x.kick_over & x.kick.notna())
print('== Overpairs ==')
both('overpair: one or two ranks over the board v higher', lambda x: (x.klass == 'overpair') & (x.hi - x.board_top <= 2), lambda x: (x.klass == 'overpair') & (x.hi - x.board_top > 2))
both('overpair: aces v the rest', lambda x: (x.klass == 'overpair') & (x.hi == 12), lambda x: (x.klass == 'overpair') & (x.hi < 12))
print('== No pair ==')
NP = lambda x: (x.klass == 'no pair') & x.nodraw
both('no pair: two overcards v none', lambda x: NP(x) & (x.over == 2), lambda x: NP(x) & (x.over == 0))
both('no pair: ace high v lower', lambda x: NP(x) & (x.hi == 12), lambda x: NP(x) & (x.hi < 12))
both('no pair, same equity: backdoor flush v none', lambda x: NP(x) & x.bdf, lambda x: NP(x) & ~x.bdf, match='e')
both('no pair, same equity: backdoor straight v none', lambda x: NP(x) & x.bds, lambda x: NP(x) & (x.ways == 0), match='e')
both('no pair, same equity: both backdoors v neither', lambda x: NP(x) & x.bds & x.bdf, lambda x: NP(x) & (x.ways == 0) & ~x.bdf, match='e')
print('== Draws ==')
D = lambda x: x.klass == 'no pair'
both('flush draw: nut v not', lambda x: D(x) & x.fd & (x.fd_nut == 0), lambda x: D(x) & x.fd & (x.fd_nut > 0))
both('flush draw v open-ender', lambda x: D(x) & x.fd & ~x.oesd & ~x.gut, lambda x: D(x) & x.oesd & ~x.fd)
both('open-ender v gutshot', lambda x: D(x) & x.oesd & ~x.fd, lambda x: D(x) & x.gut & ~x.fd)
both('gutshot v nothing, same equity', lambda x: D(x) & x.gut & ~x.fd, lambda x: NP(x), match='e')
both('gutshot with two overcards v gutshot without', lambda x: D(x) & x.gut & ~x.fd & (x.over == 2), lambda x: D(x) & x.gut & ~x.fd & (x.over == 0))
both('pair with a draw v the pair alone', lambda x: x.klass.isin(['top pair', 'middle pair', 'bottom pair']) & (x.fd | x.oesd), lambda x: x.klass.isin(['top pair', 'middle pair', 'bottom pair']) & x.nodraw)
print('== Underpairs against board pairs (same equity) ==')
both('pocket pair under the board v a pair with the board', lambda x: x.klass.isin(['underpair', 'pocket below top']), lambda x: x.klass.isin(['middle pair', 'bottom pair']), match='e')
print('== Exposure to the next card, inside a class, at the same equity ==')
for k in ['top pair', 'overpair', 'middle pair', 'bottom pair', 'pocket below top', 'two pair', 'set']:
    med = d[d.klass == k].down.median()
    both(f'{k}: loses more on bad turns v less', lambda x, k=k, med=med: (x.klass == k) & (x.down > med), lambda x, k=k, med=med: (x.klass == k) & (x.down <= med), match='e')
print('== Sets, two pair: wet v dry (across flops, not paired) ==')
for k in ['set', 'two pair', 'overpair', 'top pair']:
    for name, data, col in [('bet', U, 'bet'), ('raise facing a bet', F, 'raise')]:
        x = data[data.klass == k]; wet = x[(x.board_suited >= 2) | (x.board_conn >= 3)]; dry = x[(x.board_suited == 1) & (x.board_conn <= 2)]
        print(f'  {k:<10} {name:<20} wet {wmean(wet, col):.2f} ({wet.spot.nunique()} flops)   dry {wmean(dry, col):.2f} ({dry.spot.nunique()} flops)')
print('== In and out of position, aggressor and caller: what bets (not paired) ==')
for k in ['no pair', 'top pair', 'overpair', 'middle pair', 'set']:
    x = U[U.klass == k]; print(f'  {k:<10}', '  '.join(f"{'IP' if ip else 'OOP'} {'raiser' if pfa else 'caller'} {wmean(x[(x.ip == ip) & (x.pfa == pfa)], 'bet'):.2f}" for ip in [False, True] for pfa in [True, False]))
