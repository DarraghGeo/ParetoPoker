# The same check after betting: turn and river decisions of solved spots (research/insight collections), where each range
# is what the action has left. Does "who has more top pair or better" still name the player with the range advantage?
import json, glob, re, numpy as np, pandas as pd, itertools, collections, warnings; warnings.filterwarnings('ignore')
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import GroupKFold
R = '23456789TJQKA'; SU = 'shdc'
def made(hole, board):
    """What the two cards make with the board, counting only what the hole cards add: 3 a straight, flush or trips and better;
    2 two pair with both cards; 1.5 an overpair; 1 top pair; 0.5 another pair; 0 nothing."""
    hr = [c[0] for c in hole]; br = [c[0] for c in board]; allc = hole + board; top = max(br)
    for s in range(4):
        if sum(1 for c in allc if c[1] == s) >= 5 and any(c[1] == s for c in hole) and sum(1 for c in board if c[1] == s) < 5: return 3
    def straight(rs): rs = set(rs) | ({-1} if 12 in rs else set()); return max((h for h in range(3, 13) if all((h - k) in rs for k in range(5))), default=None)
    sa, sb = straight([c[0] for c in allc]), straight(br)
    if sa is not None and (sb is None or sa > sb): return 3
    cnt = collections.Counter(hr + br)
    if any(cnt[r] >= 3 for r in hr): return 3
    pocket = hr[0] == hr[1]; hits = [r for r in set(hr) if r in br]
    if len(hits) == 2: return 2
    if pocket: return 1.5 if hr[0] > top else 0.5
    if hits: return 1 if hits[0] == top else 0.5
    return 0
def card(t): return (R.index(t[0]), SU.index(t[1]))
def shares(hands, board):
    tot = tp = pair = big = 0.0
    for h, w in hands:
        m = made([card(h[:2]), card(h[2:])], board); tot += w; pair += w * (m > 0); tp += w * (m >= 1); big += w * (m >= 2)
    return tp / tot, pair / tot, big / tot
rows = []; files = sorted(glob.glob('../insight/out/full-*.jsonl')) + [f for f in sorted(glob.glob('../insight/out/hands-*.jsonl')) if int(re.search(r'hands-(\d+)', f).group(1)) >= 7]
for f in files:
    for l in open(f):
        r = json.loads(l); board = [card(c) for c in r['board'].split()]
        if len(board) < 4 or min(r['reach']) < 0.02 or not r.get('vr'): continue
        mine = [(h['h'], h['w']) for h in r['hands'] if h['w'] > 0 and h['e'] is not None]; his = [(x[0], x[1]) for x in r['vr'] if x[2] is not None]
        if len(mine) < 15 or len(his) < 15: continue
        w = np.array([h['w'] for h in r['hands'] if h['w'] > 0 and h['e'] is not None]); e = np.array([h['e'] for h in r['hands'] if h['w'] > 0 and h['e'] is not None]); adv = float((w * e).sum() / w.sum()) - 0.5
        a, b = shares(mine, board), shares(his, board); sgn = 1 if r['seat'] == 0 else -1   # everything from the out-of-position player's side
        rows.append(dict(spot=r['spot'], street=len(board), line=re.sub(r'\d', '', r['line']), facing=r['toCall'] > 0, adv=sgn * adv, d_tp=sgn * (a[0] - b[0]), d_pair=sgn * (a[1] - b[1]), d_big=sgn * (a[2] - b[2])))
T = pd.DataFrame(rows); T['sit'] = T.groupby(['line', 'street']).adv.transform('mean'); print(len(T), 'decisions on', T.spot.nunique(), 'flops; advantage sd', round(100 * T.adv.std(), 1), 'points')
def pred(t, cols):
    X = t[cols].values; Y = t.adv.values; p = np.zeros(len(t))
    for tr, te in GroupKFold(5).split(X, Y, t.spot): p[te] = LinearRegression().fit(X[tr], Y[tr]).predict(X[te])
    return p
for title, t in (('TURN', T[T.street == 4]), ('RIVER', T[T.street == 5]), ('TURN AND RIVER, before a bet', T[~T.facing]), ('TURN AND RIVER, facing a bet', T[T.facing])):
    a = t.adv.abs().values; print(f'\n{title}: {len(t)} decisions; correlation of the advantage with top pair or better {np.corrcoef(t.d_tp, t.adv)[0,1]:.2f}, any pair {np.corrcoef(t.d_pair, t.adv)[0,1]:.2f}, two pair or better {np.corrcoef(t.d_big, t.adv)[0,1]:.2f}')
    for name, cols in [('the line alone (who usually has it after this action)', ['sit']), ('top pair or better alone', ['d_tp']), ('line + top pair or better', ['sit', 'd_tp']), ('line + top pair or better + any pair', ['sit', 'd_tp', 'd_pair']), ('line + all three counts', ['sit', 'd_tp', 'd_pair', 'd_big'])]:
        p = pred(t, cols); ok = np.sign(p) == np.sign(t.adv.values); print(f'  {name:55s} off by {100*np.abs(p - t.adv.values).mean():4.1f} | right player: ' + '  '.join(f'{lab} {100*ok[m].mean():3.0f}%' for lab, m in (('under 1.5', a < .015), ('1.5-4', (a >= .015) & (a < .04)), ('4-8', (a >= .04) & (a < .08)), ('over 8', a >= .08)) if m.sum() > 20))
    print('  share of decisions by size of advantage:', '  '.join(f'{lab} {100*m.mean():.0f}%' for lab, m in (('under 1.5', a < .015), ('1.5-4', (a >= .015) & (a < .04)), ('4-8', (a >= .04) & (a < .08)), ('over 8', a >= .08))))
# the simplest reading of all: no fitting, just "whoever has the bigger share of top pair or better"
for title, t in (('turn', T[T.street == 4]), ('river', T[T.street == 5])):
    a = t.adv.abs().values; ok = np.sign(t.d_tp.values) == np.sign(t.adv.values); print(f'\nno fitting, {title}: whoever has the bigger share of top pair or better has the advantage: ' + '  '.join(f'{lab} {100*ok[m].mean():3.0f}%' for lab, m in (('under 1.5', a < .015), ('1.5-4', (a >= .015) & (a < .04)), ('4-8', (a >= .04) & (a < .08)), ('over 8', a >= .08))))
