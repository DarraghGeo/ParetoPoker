# Experiment 8. What sorts the bars that the equity lines leave unsorted? Inside middle pair, low pair and trash on the
# flop and turn (betting decisions with mixing), the correlation between how often a hand bets and things a player can
# see in the hand: its kicker, the rank of its pair, a gutshot, overcards, a card of the board's suit, and how often he
# folds to this particular hand (its blockers), beside the equity measures.
import json, glob, re, numpy as np, collections, warnings; warnings.filterwarnings('ignore')
RANK = '23456789TJQKA'
def level(h):
    if h['own'] >= 1 and h['made'] >= 3: return 'Set +'
    if h['own'] >= 2 and h['made'] == 2: return 'Two pair'
    p = h.get('pair')
    if p == 'overpair': return 'Overpair'
    if p == 'top pair': return 'Top pair'
    if p == 'middle pair': return 'Middle pair'
    if p in ('bottom pair', 'underpair') or h['own'] >= 1: return 'Low pair'
    return 'Draws' if (h['fo'] >= 8 or h['so'] >= 4) else 'Trash'
def seen(h, board, main):
    a, b = RANK.index(h['h'][0]), RANK.index(h['h'][2]); sa, sb = h['h'][1], h['h'][3]; br = [RANK.index(c[0]) for c in board]; bs = [c[1] for c in board]; top = max(br)
    suit = max(set(bs), key=bs.count); many = bs.count(suit); pocket = a == b; hit = [r for r in (a, b) if r in br]
    out = dict(equity=h['e'], ahead_now=h['now'], to_come=h['draw'], against_his_best=h['top'], high_card=max(a, b), low_card=min(a, b), overcards=sum(r > top for r in (a, b)), suited=float(sa == sb),
               holds_board_suit=float(many >= 2 and (sa == suit or sb == suit)), gutshot=float(4 <= h['so'] < 8), any_outs=float(h['fo'] + h['so']), pocket=float(pocket),
               kicker=(min(a, b) if pocket else max([r for r in (a, b) if r not in br], default=min(a, b))), pair_rank=(a if pocket else (max(hit) if hit else -1)))
    rep = h.get('re'); out['he_folds_to_it'] = rep[main][0] if rep and rep[main] and rep[main][0] is not None else np.nan
    return out
def wcorr(x, y, w):
    ok = ~np.isnan(x); x, y, w = x[ok], y[ok], w[ok]
    if len(x) < 6: return np.nan
    mx = (w * x).sum() / w.sum(); my = (w * y).sum() / w.sum(); v = np.sqrt((w * (x - mx) ** 2).sum() * (w * (y - my) ** 2).sum()); return (w * (x - mx) * (y - my)).sum() / v if v > 1e-9 else np.nan
res = collections.defaultdict(lambda: collections.defaultdict(list))
files = sorted(glob.glob('../insight/out/full-*.jsonl')) + [f for f in sorted(glob.glob('../insight/out/hands-*.jsonl')) if int(re.search(r'hands-(\d+)', f).group(1)) >= 7]
for f in files:
    for line in open(f):
        r = json.loads(line); board = r['board'].split(); st = len(board)
        if st == 5 or r['toCall'] > 0 or min(r['reach']) < 0.05: continue
        hs = [h for h in r['hands'] if h['w'] > 0 and h['e'] is not None and h.get('now') is not None and h.get('top') is not None]
        if len(hs) < 40: continue
        w = np.array([h['w'] for h in hs]); a = np.array([1 - h['p'][0] for h in hs]); y = (w * a).sum() / w.sum()
        if not 0.12 < y < 0.88: continue
        bets = [k for k, act in enumerate(r['actions']) if act['kind'] in ('bet', 'allin')]
        if not bets: continue
        main = max(bets, key=lambda k: r['actions'][k]['freq']); lv = [level(h) for h in hs]
        for name in ('Middle pair', 'Low pair', 'Trash', 'Draws', 'Top pair'):
            idx = [i for i, l in enumerate(lv) if l == name]
            if len(idx) < 8: continue
            ak = a[idx]; wk = w[idx]; mk = (wk * ak).sum() / wk.sum()
            if (wk * (ak - mk) ** 2).sum() / wk.sum() < 0.01: continue
            F = [seen(hs[i], board, main) for i in idx]
            for key in F[0]:
                c = wcorr(np.array([x[key] for x in F], float), ak, wk)
                if not np.isnan(c): res[(st, name)][key].append(c)
for st in (4, 3):
    print(f"\n== {'Turn' if st == 4 else 'Flop'} betting: inside a bar, what goes with betting (correlation, share of decisions with the same sign, decisions)")
    for name in ('Top pair', 'Middle pair', 'Low pair', 'Draws', 'Trash'):
        R = res[(st, name)]
        if not R: continue
        rows = sorted(((np.mean(v), k, np.mean(np.sign(v) == np.sign(np.mean(v))), len(v)) for k, v in R.items() if len(v) >= 25), key=lambda t: -abs(t[0]))
        print(f'  {name}:'); print('     ' + '   '.join(f'{k} {c:+.2f} ({100*s:.0f}%, {n})' for c, k, s, n in rows[:7]))
