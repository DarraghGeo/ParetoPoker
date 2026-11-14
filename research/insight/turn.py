# The turn: who bets again, who gives up, who starts betting after a checked flop.
import sys; sys.path.insert(0, 'research/insight')
from lib import *
import warnings; warnings.filterwarnings('ignore')
d = load(street=4); d['size_pos'] = np.nan; d['nodraw'] = ~d.fd & ~d.oesd & ~d.gut
# what the hand was on the flop, and what the turn card did
def before(r):
    b = cards(r.board); h = cards(r.hand); flop = b[:3]; t = b[3]; br = [x for x, _ in flop]; hr = [x for x, _ in h]
    had_pair = any(x in br for x in hr) or hr[0] == hr[1]
    suit = [s for s in 'shdc' if sum(1 for _, x in flop if x == s) + sum(1 for _, x in h if x == s) == 3 and any(x == s for _, x in h)]
    return pd.Series(dict(turn_rank=t[0], turn_over=t[0] > max(br), turn_pairs_board=t[0] in br, hit_turn=(t[0] in hr) and not had_pair, picked_fd=bool(r.fd and t[1] in suit), had_pair=had_pair, turn_flush=sum(1 for _, x in b if x == t[1]) >= 3))
d = pd.concat([d, d.apply(before, axis=1)], axis=1)
d['who'] = d.line.str.split('|').str[0].str.replace(r'\d', '', regex=True); d['pos'] = d.line.str.split('|').str[1]
print(f'{d.spot.nunique()} flops, {d.key.nunique()} turn decisions'); print(d.groupby(['who', 'pos']).key.nunique().to_dict(), '\n')
C = ['bet', 'e']
def run(title, data, A, B, match=None, min_w=0.4):
    return verdict(paired(data, A, B, C, match=match, min_w=min_w), C, title)
# the bettor's second barrel: OOP bet and was called (bc|first), or IP bet after a check and was called (xbc|x)
barrel = d[((d.who == 'bc') & (d.pos == 'first')) | ((d.who == 'xbc') & (d.pos == 'x'))]
delayed = d[(d.who == 'xx') & (d.pos == 'x')]; probe = d[(d.who == 'xx') & (d.pos == 'first')]
lead = d[((d.who == 'xbc') & (d.pos == 'first'))]; afterx = d[(d.who == 'bc') & (d.pos == 'x')]
NP = lambda x: (x.klass == 'no pair')
for name, data in [('Second barrel', barrel), ('Delayed bet in position (flop checked through)', delayed), ('Probe out of position (flop checked through)', probe), ('Caller in position after the bettor checks the turn', afterx)]:
    print(f'== {name}: {data.key.nunique()} decisions ==')
    g = data.groupby('klass').apply(lambda x: pd.Series(dict(share=x.w.sum(), eq=wmean(x, 'e'), bet=wmean(x, 'bet')))); g['share'] /= g.share.sum(); print(g.sort_values('eq').round(2).T.to_string())
    run('no pair: flush draw v no draw', data, lambda x: NP(x) & x.fd, lambda x: NP(x) & x.nodraw)
    run('no pair: open-ender v no draw', data, lambda x: NP(x) & x.oesd & ~x.fd, lambda x: NP(x) & x.nodraw)
    run('no pair: gutshot v no draw', data, lambda x: NP(x) & x.gut & ~x.fd, lambda x: NP(x) & x.nodraw)
    run('no pair: gutshot v no draw, same equity', data, lambda x: NP(x) & x.gut & ~x.fd, lambda x: NP(x) & x.nodraw, match='e')
    run('no pair: flush draw v open-ender', data, lambda x: NP(x) & x.fd & ~x.oesd, lambda x: NP(x) & x.oesd & ~x.fd)
    run('flush draw: nut v lower', data, lambda x: NP(x) & x.fd & (x.fd_nut == 0), lambda x: NP(x) & x.fd & (x.fd_nut > 0))
    run('flush draw: picked up on the turn v had it on the flop', data, lambda x: NP(x) & x.fd & x.picked_fd, lambda x: NP(x) & x.fd & ~x.picked_fd)
    run('no draw, no pair: two overcards v none', data, lambda x: NP(x) & x.nodraw & (x.over == 2), lambda x: NP(x) & x.nodraw & (x.over == 0))
    run('no draw, no pair: ace high v lower', data, lambda x: NP(x) & x.nodraw & (x.hi == 12), lambda x: NP(x) & x.nodraw & (x.hi < 12))
    run('no draw, no pair: holds the ace or king of the flush suit v not', data, lambda x: NP(x) & x.nodraw & (x.blocker_fd == True), lambda x: NP(x) & x.nodraw & (x.blocker_fd == False), match='e')
    run('no draw, no pair: he folds more to this hand v less (same equity)', data, lambda x: NP(x) & x.nodraw & (x.hefolds > x.groupby('key').hefolds.transform('median')), lambda x: NP(x) & x.nodraw & (x.hefolds <= x.groupby('key').hefolds.transform('median')), match='e')
    run('top pair: best two kickers v the rest', data, lambda x: (x.klass == 'top pair') & (x.kick_rank <= 1), lambda x: (x.klass == 'top pair') & (x.kick_rank > 1))
    run('top pair with a draw v without', data, lambda x: (x.klass == 'top pair') & ~x.nodraw, lambda x: (x.klass == 'top pair') & x.nodraw)
    run('middle or bottom pair with a draw v without', data, lambda x: x.klass.isin(['middle pair', 'bottom pair', 'pocket below top']) & ~x.nodraw, lambda x: x.klass.isin(['middle pair', 'bottom pair', 'pocket below top']) & x.nodraw)
    run('pair made on the turn v pair held from the flop (same equity)', data, lambda x: x.klass.isin(['top pair', 'middle pair', 'bottom pair']) & x.hit_turn, lambda x: x.klass.isin(['top pair', 'middle pair', 'bottom pair']) & ~x.hit_turn, match='e')
    run('overpair: one or two over the board v higher', data, lambda x: (x.klass == 'overpair') & (x.hi - x.board_top <= 2), lambda x: (x.klass == 'overpair') & (x.hi - x.board_top > 2))
    for k in ['top pair', 'overpair', 'middle pair']:
        x = data[data.klass == k]; print(f'  {k:<12} bets: turn overcard {wmean(x[x.turn_over], "bet"):.2f}  other {wmean(x[~x.turn_over], "bet"):.2f}   flush-completing turn {wmean(x[x.turn_flush], "bet"):.2f}  not {wmean(x[~x.turn_flush], "bet"):.2f}')
    print()
