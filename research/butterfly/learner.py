# A check on analyse.py's "learnt cuts", which are deliberately simple (two cuts a row, learnt for a street and seat). If a
# far stronger learner, given everything the butterfly shows about a hand and its spot, does no better on spots it has not
# seen, the limit is in what the picture holds across spots and not in the simple cuts. Gradient-boosted trees, five folds
# split by spot, predicting Always / Mix / Never for every hand from:
#   chart      its row, its equity, its place along its row's bar, how big its row is, and the street, seat and situation
#   + table    who led, the pot type, the range and nut advantage, both ranges' share of each row
#   + often    how often the range acts in the spot (which a player does not know: an upper bound)
#   python3 research/butterfly/learner.py
import json, os, sys
import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.model_selection import GroupKFold
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib.util
HERE = os.path.dirname(os.path.abspath(__file__)); DATA = os.path.join(HERE, '..', 'insight', 'out')
src = open(os.path.join(HERE, 'analyse.py')).read().split('# ---------------------------------------------------------------- read')[0]
exec(src)                                    # row_of, cards, role_of, the constants

rng = np.random.default_rng(5); X = []; Y = []; Wt = []; G = []; DEC = []; POTS = ['SRP', '3BP', '4BP', 'Squeeze']; ROLES = ['none', 'led', 'followed']
for name in FILES:
    path = os.path.join(DATA, name + '.jsonl')
    if not os.path.exists(path): continue
    for text in open(path):
        d = json.loads(text); vr = d.get('vr')
        if not vr or not d['hands']: continue
        board = cards(d['board']); acts = d['actions']; first = d['toCall'] <= 0; kinds = [a['kind'] for a in acts]
        wag = [i for i, k in enumerate(kinds) if k in WAGER]; fold = kinds.index('fold') if 'fold' in kinds else -1
        if (first and not wag) or (not first and fold < 0): continue
        hs = [h for h in d['hands'] if h['e'] is not None and h['w'] > 0]
        if len(hs) < 8: continue
        w = np.array([h['w'] for h in hs]); e = np.array([h['e'] for h in hs]); P = np.array([h['p'] for h in hs]); f = P[:, wag].sum(axis=1) if first else 1 - P[:, fold]
        kind = np.where(f >= 0.9, 2, np.where(f <= 0.1, 0, 1)); row = np.array([row_of(cards(h['h']), board) for h in hs])
        vw = np.array([x[1] for x in vr]); vrow = np.array([row_of(cards(x[0]), board) for x in vr])
        ms = np.array([w[row == r].sum() for r in range(8)]) / w.sum(); hsr = np.array([vw[vrow == r].sum() for r in range(8)]) / max(vw.sum(), 1e-9)
        frac = np.zeros(len(hs))
        for r in range(8):
            m = np.where(row == r)[0]
            if len(m): o = m[np.argsort(e[m], kind='stable')]; frac[o] = (np.cumsum(w[o]) - w[o] / 2) / w[o].sum()
        act = float((w * f).sum() / w.sum()); price = d['toCall'] / (d['pot'] + d['toCall']) if not first else 0
        ctx = [len(board) - 3, int(first), d['seat'], ROLES.index(role_of(d)), POTS.index(d['action']) if d['action'] in POTS else 4, ms[4:].sum() - hsr[4:].sum(), ms[6:].sum() - hsr[6:].sum(), float((w * e).sum() / w.sum()), price, *ms, *hsr, act]
        keep = rng.random(len(hs)) < 0.35
        for i in np.where(keep)[0]:
            X.append([row[i], e[i], frac[i], ms[row[i]], *ctx]); Y.append(kind[i]); Wt.append(w[i] / w.sum()); G.append(d['spot']); DEC.append(len(DEC) and 0)
X = np.array(X, dtype=np.float32); Y = np.array(Y); Wt = np.array(Wt); G = np.array(G); first = X[:, 5] == 1
print(f'{len(Y)} hands sampled', file=sys.stderr)
# columns: 0 row, 1 equity, 2 place on bar, 3 row size, 4 street, 5 first, 6 seat, 7 role, 8 pot, 9 range adv, 10 nut adv, 11 range equity, 12 price, 13..20 my rows, 21..28 his rows, 29 how often
SETS = {'chart (row, equity, place on bar, street, seat)': [0, 1, 2, 3, 4, 5, 6, 12], '+ table (who led, pot, advantages, both ranges by row)': list(range(0, 29)), '+ how often the range acts (not known at the table)': list(range(0, 30))}
out = open(os.path.join(HERE, 'learner.md'), 'w')
def both(*a):
    print(*a); print(*a, file=out)
both('# A strong learner on the same information (spots not seen in training)\n')
both('| given | first to act: right | severe | facing a bet: right | severe |'); both('|---|---|---|---|---|')
pred_all = {}
for name, cols in SETS.items():
    pred = np.zeros(len(Y), dtype=int)
    for tr, te in GroupKFold(n_splits=5).split(X, Y, G):
        m = HistGradientBoostingClassifier(max_iter=200, learning_rate=0.1, max_leaf_nodes=31, categorical_features=[cols.index(c) for c in (0, 7, 8) if c in cols]).fit(X[tr][:, cols], Y[tr], sample_weight=Wt[tr])
        pred[te] = m.predict(X[te][:, cols])
    pred_all[name] = pred; cells = []
    for sit in (True, False):
        m = first == sit; right = (Wt[m] * (pred[m] == Y[m])).sum() / Wt[m].sum(); sev = (Wt[m] * (np.abs(pred[m] - Y[m]) == 2)).sum() / Wt[m].sum(); cells += [f'{100 * right:.0f}%', f'{100 * sev:.0f}%']
    both(f'| {name} | ' + ' | '.join(cells) + ' |')
both('\nBy street, with the table\'s information (first to act / facing a bet):\n'); both('| | first to act | facing a bet |'); both('|---|---|---|')
pred = pred_all['+ table (who led, pot, advantages, both ranges by row)']
for s, nm in enumerate(['flop', 'turn', 'river']):
    cells = []
    for sit in (True, False):
        m = (first == sit) & (X[:, 4] == s); cells.append(f'{100 * (Wt[m] * (pred[m] == Y[m])).sum() / Wt[m].sum():.0f}%')
    both(f'| {nm} | ' + ' | '.join(cells) + ' |')
both('\nBy row, first to act, with the table\'s information:\n'); both('| row | right | severe |'); both('|---|---|---|')
for r in range(7, -1, -1):
    m = first & (X[:, 0] == r)
    both(f'| {ROWS[r]} | {100 * (Wt[m] * (pred[m] == Y[m])).sum() / Wt[m].sum():.0f}% | {100 * (Wt[m] * (np.abs(pred[m] - Y[m]) == 2)).sum() / Wt[m].sum():.0f}% |')
out.close()
