# Mechanisms. For the ideas that show up in hunt.py: does the reason a player would give predict where the effect is
# strong and where it is absent?
import sys; sys.path.insert(0, 'research/insight')
from lib import *
import warnings; warnings.filterwarnings('ignore')
d = load(street=3); d['size_pos'] = (d['size'] - d.smin) / (d.smax - d.smin); d['nodraw'] = ~d.fd & ~d.oesd & ~d.gut; d['over_real'] = d.v - d.e
U = d[~d.facing]; F = d[d.facing]; ctxU = context(U); ctxF = context(F)
print(f'{d.spot.nunique()} flops, {U.key.nunique()} betting decisions, {F.key.nunique()} facing a bet\n')
def run(title, data, A, B, cols, match=None, mods=None, min_w=0.5):
    r = paired(data, A, B, cols, match=match, min_w=min_w); out = verdict(r, cols, title)
    for c in (mods or []):
        if len(r) >= 14: moderators(r, ctxU if data is U else ctxF, c)
    return r
C = ['bet', 'size_pos', 'e', 'over_real']; G = ['fold', 'call', 'raise', 'e']
print('1. Which bet sizes does he raise? (per decision: raise frequency against the smallest and the largest bet the range uses)')
import json, glob
rows = []
for f in glob.glob('research/insight/out/hands-*.jsonl'):
    for line in open(f):
        x = json.loads(line)
        if len(x['board'].replace(' ', '')) != 6 or x['toCall'] > 0: continue
        bets = [i for i, a in enumerate(x['actions']) if a['kind'] == 'bet' and a['freq'] > 0.05]
        if len(bets) < 2: continue
        W = lambda i, k: sum(h['w'] * h['p'][i] * h['re'][i][k] for h in x['hands'] if h['re'][i] and h['re'][i][k] is not None) / max(1e-9, sum(h['w'] * h['p'][i] for h in x['hands'] if h['re'][i] and h['re'][i][k] is not None))
        rows.append(dict(spot=x['spot'], seat=x['seat'], small_raised=W(bets[0], 1), big_raised=W(bets[-1], 1), small_fold=W(bets[0], 0), big_fold=W(bets[-1], 0)))
z = pd.DataFrame(rows); print(f'   {len(z)} decisions: small bet raised {z.small_raised.mean():.1%}, big bet raised {z.big_raised.mean():.1%}; small bet folds {z.small_fold.mean():.1%}, big bet folds {z.big_fold.mean():.1%}; big raised less in {(z.big_raised < z.small_raised).mean():.0%}\n')
print('2. Top pair and overpair with a backdoor flush draw: smaller, or checked - and where?')
for k in ['top pair', 'overpair']:
    run(f'{k}: backdoor flush v none', U, lambda x, k=k: (x.klass == k) & x.bdf & x.nodraw, lambda x, k=k: (x.klass == k) & ~x.bdf & x.nodraw, C, mods=['bet', 'size_pos'])
    run(f'{k}: nut backdoor v none', U, lambda x, k=k: (x.klass == k) & x.bdf & (x.bdf_nut <= 1) & x.nodraw, lambda x, k=k: (x.klass == k) & ~x.bdf & x.nodraw, C)
    run(f'{k}: low backdoor v none', U, lambda x, k=k: (x.klass == k) & x.bdf & (x.bdf_nut > 1) & x.nodraw, lambda x, k=k: (x.klass == k) & ~x.bdf & x.nodraw, C)
    run(f'{k} facing a bet: backdoor flush v none', F, lambda x, k=k: (x.klass == k) & x.bdf & x.nodraw, lambda x, k=k: (x.klass == k) & ~x.bdf & x.nodraw, G, mods=['raise'])
print('\n3. Marginal hands facing a bet: the backdoor flush draw as the reason to continue')
for k in ['middle pair', 'bottom pair', 'pocket below top', 'underpair', 'no pair']:
    run(f'{k}: backdoor flush v none (same equity)', F, lambda x, k=k: (x.klass == k) & x.bdf & x.nodraw, lambda x, k=k: (x.klass == k) & ~x.bdf & x.nodraw, G, match='e', mods=['fold'])
print('\n4. Showdown value: ace high and king high against lower unpaired hands')
NP = lambda x: (x.klass == 'no pair') & x.nodraw
run('ace high v lower: betting', U, lambda x: NP(x) & (x.hi == 12), lambda x: NP(x) & (x.hi < 12), C, mods=['bet'])
run('ace high v lower: facing a bet', F, lambda x: NP(x) & (x.hi == 12), lambda x: NP(x) & (x.hi < 12), G, mods=['fold'])
run('weakest third of no-pair v the rest: betting', U, lambda x: NP(x) & (x.e < 0.25), lambda x: NP(x) & (x.e >= 0.25), C, mods=['bet'])
print('\n5. Draws: which bet, which raise')
D = lambda x: x.klass == 'no pair'
run('nut flush draw v lower: betting', U, lambda x: D(x) & x.fd & (x.fd_nut == 0), lambda x: D(x) & x.fd & (x.fd_nut > 0), C, mods=['bet'])
run('nut flush draw v lower: facing a bet', F, lambda x: D(x) & x.fd & (x.fd_nut == 0), lambda x: D(x) & x.fd & (x.fd_nut > 0), G, mods=['raise'])
run('gutshot v open-ender: facing a bet', F, lambda x: D(x) & x.gut & ~x.fd, lambda x: D(x) & x.oesd & ~x.fd, G, mods=['raise'])
run('flush draw v gutshot: facing a bet', F, lambda x: D(x) & x.fd, lambda x: D(x) & x.gut & ~x.fd, G, mods=['raise'])
run('draw with a pair v draw without: facing a bet', F, lambda x: (x.fd | x.oesd) & x.klass.isin(['top pair', 'middle pair', 'bottom pair']), lambda x: (x.fd | x.oesd) & D(x), G, mods=['raise'])
run('draw with a pair v draw without: betting', U, lambda x: (x.fd | x.oesd) & x.klass.isin(['top pair', 'middle pair', 'bottom pair']), lambda x: (x.fd | x.oesd) & D(x), C, mods=['bet'])
print('\n6. Top pair: kicker')
run('best two kickers v the rest: betting', U, lambda x: (x.klass == 'top pair') & (x.kick_rank <= 1), lambda x: (x.klass == 'top pair') & (x.kick_rank > 1), C, mods=['bet', 'size_pos'])
run('best two kickers v the rest: facing a bet', F, lambda x: (x.klass == 'top pair') & (x.kick_rank <= 1), lambda x: (x.klass == 'top pair') & (x.kick_rank > 1), G, mods=['raise'])
run('same equity: more to gain on the turn v less', U, lambda x: (x.klass == 'top pair') & (x.up > x.up_med), lambda x: (x.klass == 'top pair') & (x.up <= x.up_med), C, match='e') if 'up_med' in d else None
print('\n7. Overpairs: low against high')
run('one or two ranks over the board v higher: betting', U, lambda x: (x.klass == 'overpair') & (x.hi - x.board_top <= 2), lambda x: (x.klass == 'overpair') & (x.hi - x.board_top > 2), C, mods=['bet', 'size_pos'])
run('one or two ranks over the board v higher: facing', F, lambda x: (x.klass == 'overpair') & (x.hi - x.board_top <= 2), lambda x: (x.klass == 'overpair') & (x.hi - x.board_top > 2), G, mods=['raise'])
print('\n8. Underpairs against pairs made with the board, same equity')
run('pocket pair below the board v board pair: betting', U, lambda x: x.klass.isin(['underpair', 'pocket below top']), lambda x: x.klass.isin(['middle pair', 'bottom pair']), C, match='e', mods=['bet'])
run('pocket pair below the board v board pair: facing', F, lambda x: x.klass.isin(['underpair', 'pocket below top']), lambda x: x.klass.isin(['middle pair', 'bottom pair']), G, match='e', mods=['fold'])
print('\n9. Strong hands: who slows down')
ST = lambda x: x.klass.isin(['set', 'two pair', 'trips', 'straight+'])
for name, data, col in [('bet', U, 'bet'), ('raise facing a bet', F, 'raise')]:
    x = data[ST(data)]; g = x.groupby('key').apply(lambda y: pd.Series(dict(v=wmean(y, col), w=y.w.sum()))).join(ctxU if data is U else ctxF)
    print(f'   strong hands, {name}: ' + '  '.join(f"{c} no {g[g[c] == 0].v.mean():.2f} / yes {g[g[c] == 1].v.mean():.2f}" for c in ['ip', 'raiser', 'two_tone', 'connected', 'paired', 'high_board', 'srp']))
run('top set v lower sets: betting', U, lambda x: (x.klass == 'set') & (x.hi == x.board_top), lambda x: (x.klass == 'set') & (x.hi < x.board_top), C, min_w=0.2)
run('top set v lower sets: facing', F, lambda x: (x.klass == 'set') & (x.hi == x.board_top), lambda x: (x.klass == 'set') & (x.hi < x.board_top), G, min_w=0.2)
