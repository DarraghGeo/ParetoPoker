# What makes range advantage readable? Each range's equity against the other on sampled flops, set beside things a player
# can count at the table: how much of each range has a pair or better, top pair or better, an overpair, and whose cards
# the board's ranks are. How well does each count say who is ahead, and by how much?
import json, glob, itertools, numpy as np, pandas as pd, collections, warnings; warnings.filterwarnings('ignore')
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import GroupKFold
R = '23456789TJQKA'; SU = 'shdc'
def expand(text):
    out = []
    for part in text.split(','):
        part = part.strip()
        if not part: continue
        name, _, wt = part.partition(':'); w = float(wt) if wt else 1.0
        if w <= 0: continue
        a, b = R.index(name[0]), R.index(name[1])
        if a == b: out += [((a, s1), (b, s2), w) for s1, s2 in itertools.combinations(range(4), 2)]
        elif name.endswith('s'): out += [((a, s), (b, s), w) for s in range(4)]
        elif name.endswith('o'): out += [((a, s1), (b, s2), w) for s1 in range(4) for s2 in range(4) if s1 != s2]
        else: out += [((a, s1), (b, s2), w) for s1 in range(4) for s2 in range(4)]
    return out
def counts(combos, board):
    ranks = sorted((R.index(c[0]) for c in board), reverse=True); bset = {(R.index(c[0]), SU.index(c[1])) for c in board}; top = ranks[0]; tot = pair = tp = over = big = draw = 0.0
    bs = [SU.index(c[1]) for c in board]
    for c1, c2, w in combos:
        if c1 in bset or c2 in bset: continue
        tot += w; r1, r2 = c1[0], c2[0]; hit1, hit2 = r1 in ranks, r2 in ranks; pp = r1 == r2
        made = hit1 or hit2 or pp; two = (hit1 and hit2 and r1 != r2) or (pp and hit1) or (ranks.count(r1) >= 2 and hit1) or (ranks.count(r2) >= 2 and hit2)
        if made: pair += w
        isover = pp and r1 > top
        if isover: over += w
        if two or isover or r1 == top or r2 == top: tp += w
        if two or isover or ((r1 == top or r2 == top) and max(r1, r2) >= 10 and (r1 if r2 == top else r2) >= 9): big += w
        if c1[1] == c2[1] and bs.count(c1[1]) == 2: draw += w
    return dict(pair=pair / tot, tp=tp / tot, over=over / tot, big=big / tot, fd=draw / tot)
PRE = {p['pre']: [expand(p['ranges'][0]), expand(p['ranges'][1])] for p in json.load(open('out/ranges.json'))} if glob.glob('out/ranges.json') else None
if PRE is None:
    import subprocess; js = "import('../../web/lib/study/presets.js').then(m=>console.log(JSON.stringify(m.PRESETS.filter(p=>p.action!=='Limped').map(p=>({pre:`${p.action}-${p.oop}-${p.ip}`,ranges:[p.ranges.oop,p.ranges.ip]})))))"
    PRE = {p['pre']: [expand(p['ranges'][0]), expand(p['ranges'][1])] for p in json.loads(subprocess.check_output(['node', '-e', js]))}
rows = []
for f in glob.glob('out/flops-*.jsonl'):
    for l in open(f):
        r = json.loads(l); board = [r['board'][i:i + 2] for i in (0, 2, 4)]; a = counts(PRE[r['pre']][0], board); b = counts(PRE[r['pre']][1], board); ranks = sorted((R.index(c[0]) for c in board), reverse=True)
        rows.append(dict(pre=r['pre'], action=r['action'], board=r['board'], adv=r['eq'] - 0.5, strong=r['strong'][0] - r['strong'][1], hi=ranks[0], paired=len(set(ranks)) < 3, **{f'd_{k}': a[k] - b[k] for k in a}))
T = pd.DataFrame(rows); T['base'] = T.groupby('pre').adv.transform('mean'); print(len(T), 'flops over', T.pre.nunique(), 'matchups; advantage sd', round(100 * T.adv.std(), 1), 'points; within a matchup', round(100 * (T.adv - T.base).std(), 1))
def cv(cols, y='adv'):
    X = T[cols].values; Y = T[y].values; p = np.zeros(len(T))
    for tr, te in GroupKFold(5).split(X, Y, T.board): p[te] = LinearRegression().fit(X[tr], Y[tr]).predict(X[te])
    big = np.abs(Y) > 0.015; return 100 * np.abs(p - Y).mean(), 1 - ((p - Y) ** 2).sum() / ((Y - Y.mean()) ** 2).sum(), 100 * (np.sign(p[big]) == np.sign(Y[big])).mean()
for y, title in (('adv', 'RANGE ADVANTAGE (equity)'), ('strong', 'WHO HAS MORE STRONG HANDS (75%+ equity)')):
    print('\n' + title)
    for name, cols in [('the matchup alone (who usually has it)', ['base']), ('+ who has more pairs or better', ['base', 'd_pair']), ('+ who has more top pair or better', ['base', 'd_tp']), ('+ who has more overpairs', ['base', 'd_over']), ('+ who has more big hands (top pair good kicker, overpairs, two pair+)', ['base', 'd_big']),
                       ('top pair or better, without knowing the matchup', ['d_tp']), ('big hands, without knowing the matchup', ['d_big']), ('all the counts with the matchup', ['base', 'd_pair', 'd_tp', 'd_over', 'd_big', 'd_fd'])]:
        if y == 'strong' and 'base' in cols: T['base_s'] = T.groupby('pre').strong.transform('mean'); cols = ['base_s' if c == 'base' else c for c in cols]
        m, r2, sg = cv(cols, y); print(f'  {name:70s} off by {m:4.1f} pts   R2 {r2:5.2f}   names the right player {sg:3.0f}%')
print('\nby high card of the flop, mean advantage of the out-of-position player (points):'); print((100 * T.groupby('hi').adv.mean()).round(1).rename(index=lambda i: R[i]).to_dict())
print('correlations with advantage:', {c: round(float(np.corrcoef(T[c], T.adv)[0, 1]), 2) for c in ['d_pair', 'd_tp', 'd_over', 'd_big', 'd_fd']})
print('within matchup:', {c: round(float(np.corrcoef(T[c] - T.groupby('pre')[c].transform('mean'), T.adv - T.base)[0, 1]), 2) for c in ['d_pair', 'd_tp', 'd_over', 'd_big', 'd_fd']})
