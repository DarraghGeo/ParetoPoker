# Is "who bet the street before" just the shape of the two ranges? And do strong hands let the bettor bet unless the
# stacks are deep? Read off stored solved decisions on the turn and river (store.mjs rows).
#   STORE=<dir with fullhand.jsonl, turn-real.jsonl, river-real.jsonl> python3 research/engine/heuristics_roles.py
import json, os
import numpy as np
S = os.environ['STORE']; ST = {4: 'turn', 5: 'river'}; ROLE = {'led': 'bet the street before', 'followed': 'called the street before', 'none': 'street before checked through'}; F = []; G = []
def shares(w, e): w = w / w.sum(); b = np.digitize(e, [0.35, 0.65]); return np.array([w[b == k].sum() for k in range(3)])
for name in ('fullhand', 'turn-real', 'river-real'):
    for t in open(os.path.join(S, name + '.jsonl')):
        d = json.loads(t); st = len(d['board'].split())
        if st < 4: continue
        w = np.array([h['w'] for h in d['hands']]); e = np.array([h['e'] for h in d['hands']]); P = np.array([h['p'] for h in d['hands']]); w = w / w.sum(); kinds = [a['kind'] for a in d['actions']]
        vw = np.array([x[1] for x in d['vr']]); ve = np.array([x[2] if x[2] is not None else 0.5 for x in d['vr']]); me = shares(w, e); him = shares(vw, ve); spr = d['behind'] / d['pot']; strong = e >= 0.8
        if d['toCall'] <= 0:
            if 'bet' not in kinds and 'allin' not in kinds: continue
            p = P[:, [i for i, k in enumerate(kinds) if k != 'check']].sum(1); F.append(dict(st=st, seat=d['seat'], role=d['role'], bet=float(w @ p), me=me, him=him, re=float(w @ e), spr=spr, strongBet=float((w * p)[strong].sum() / w[strong].sum()) if w[strong].sum() > 0.02 else np.nan))
        else:
            ri = [i for i, k in enumerate(kinds) if k in ('raise', 'allin')]
            if not ri: continue
            p = P[:, ri].sum(1); fo = P[:, kinds.index('fold')] if 'fold' in kinds else 0 * w; G.append(dict(st=st, seat=d['seat'], role=d['role'], spr=spr, size=d['toCall'] / (d['pot'] - d['toCall']), raise_=float(w @ p), strongRaise=float((w * p)[strong].sum() / w[strong].sum()) if w[strong].sum() > 0.02 else np.nan, strongShare=float(w[strong].sum())))
pc = lambda x: '-' if x is None or (isinstance(x, float) and np.isnan(x)) else f'{100 * x:.0f}%'; tri = lambda v: ' / '.join(f'{100 * x:.0f}' for x in v)
print(f'# Is "who bet last" just the shape of the ranges? ({len(F)} first-to-act and {len(G)} facing-a-bet decisions on solved turns and rivers)\n')
print('Weak = under 35% equity against the other range, middle = 35-65%, strong = 65%+.\n')
print('## 1. What each role\'s range is made of\n'); print('| street | the player to act | decisions | own range: weak / middle / strong | his range: weak / middle / strong | bets |'); print('|---|---|---|---|---|---|')
for st in (4, 5):
    for role in ('led', 'followed', 'none'):
        g = [r for r in F if r['st'] == st and r['role'] == role]
        if g: print(f"| {ST[st]} | {ROLE[role]} | {len(g)} | {tri(np.mean([r['me'] for r in g], 0))} | {tri(np.mean([r['him'] for r in g], 0))} | {pc(np.mean([r['bet'] for r in g]))} |")
print('\n## 2. Bet frequency by how much of the range is weak\n'); BINS = [(0, .2, 'under 20% weak'), (.2, .3, '20-30%'), (.3, .4, '30-40%'), (.4, .5, '40-50%'), (.5, 2, 'over 50%')]
for st in (4, 5):
    print(f'{ST[st].capitalize()}:\n'); print('| own weak share | all | ' + ' | '.join(ROLE[r] for r in ('led', 'followed', 'none')) + ' |'); print('|---|---|---|---|---|')
    for lo, hi, nm in BINS:
        cell = lambda g: f"{pc(np.mean([r['bet'] for r in g]))} ({len(g)})" if len(g) >= 8 else '-'
        print(f'| {nm} | ' + cell([r for r in F if r['st'] == st and lo <= r['me'][0] < hi]) + ' | ' + ' | '.join(cell([r for r in F if r['st'] == st and r['role'] == role and lo <= r['me'][0] < hi]) for role in ('led', 'followed', 'none')) + ' |')
    print()
print('## 3. How much of the bet frequency each read explains\n'); print('Share of the variation in bet frequency explained by a straight-line rule on the read (0 = nothing, 100 = all).\n'); print('| read | turn | river |'); print('|---|---|---|')
def r2(X, y): X = np.column_stack([np.ones(len(y))] + X); b = np.linalg.lstsq(X, y, rcond=None)[0]; return 1 - ((y - X @ b) ** 2).sum() / ((y - y.mean()) ** 2).sum()
def cols(g, which):
    out = []
    if 'role' in which: out += [np.array([r['role'] == 'led' for r in g], float), np.array([r['role'] == 'followed' for r in g], float)]
    if 'seat' in which: out += [np.array([r['seat'] for r in g], float)]
    if 'equity' in which: out += [np.array([r['re'] for r in g])]
    if 'weak' in which: out += [np.array([r['me'][0] for r in g])]
    if 'own' in which: out += [np.array([r['me'][0] for r in g]), np.array([r['me'][2] for r in g])]
    if 'his' in which: out += [np.array([r['him'][0] for r in g]), np.array([r['him'][2] for r in g])]
    return out
for nm, which in (('who bet the street before', ('role',)), ('the seat', ('seat',)), ('the range\'s equity', ('equity',)), ('own weak share', ('weak',)), ('own weak and strong shares', ('own',)), ('his weak and strong shares', ('his',)), ('both ranges\' weak and strong shares', ('own', 'his')), ('both ranges\' shares and the seat', ('own', 'his', 'seat')), ('both ranges\' shares, the seat and who bet before', ('own', 'his', 'seat', 'role'))):
    print(f'| {nm} | ' + ' | '.join(f"{100 * r2(cols(g, which), np.array([r['bet'] for r in g])):.0f}" for g in ([r for r in F if r['st'] == 4], [r for r in F if r['st'] == 5])) + ' |')
print('\n## 4. Strong hands (80%+ equity): bet, or let him bet?\n'); SP = [(0, 1, 'under 1 pot behind'), (1, 2.5, '1 to 2.5 pots'), (2.5, 6, '2.5 to 6 pots'), (6, 99, 'over 6 pots')]
print('First to act out of position, having called the street before: how often the strong hands bet.\n'); print('| stack behind | turn | river |'); print('|---|---|---|')
for lo, hi, nm in SP: print(f'| {nm} | ' + ' | '.join((lambda g: f"{pc(np.nanmean([r['strongBet'] for r in g]))} ({len(g)})" if len(g) >= 8 else '-')([r for r in F if r['st'] == st and r['seat'] == 0 and r['role'] == 'followed' and lo <= r['spr'] < hi]) for st in (4, 5)) + ' |')
print('\nFacing a bet with a raise available: how often the strong hands raise (and how often the whole range raises).\n'); print('| stack behind after his bet | turn, out of position | turn, in position | river, out of position | river, in position |'); print('|---|---|---|---|---|')
for lo, hi, nm in SP: print(f'| {nm} | ' + ' | '.join((lambda g: f"{pc(np.nanmean([r['strongRaise'] for r in g]))}, range {pc(np.mean([r['raise_'] for r in g]))} ({len(g)})" if len(g) >= 8 else '-')([r for r in G if r['st'] == st and r['seat'] == s and lo <= r['spr'] < hi]) for st in (4, 5) for s in (0, 1)) + ' |')
