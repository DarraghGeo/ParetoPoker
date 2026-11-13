"""Step 4 and 5: which features decide the action. Models fitted on one group of sets and scored on
held-out sets (other boards), for every kind of decision. Score: how much of the solver's choice is
explained (R2, weighted), and what the predicted play gives up against the equilibrium (share of pot)."""
import sys, numpy as np, pandas as pd
sys.path.insert(0, 'diagnosis')
from hands_load import load, wmean
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.inspection import permutation_importance
train_sets, test_sets = sys.argv[1].split(','), sys.argv[2].split(',')
tr, te = load(*train_sets), load(*test_sets)
turn = tr.street.iloc[0] != 'river'
FREQ = ['fAgg', 'fCall', 'fPassive']
GROUPS = [
    ('rank within range + the frequencies', ['rank'] + FREQ),
    ('+ equity (absolute, and against his best quarter)', ['eq', 'eqTop']),
]
if turn: GROUPS.append(('+ what the hand becomes (strength now, draws, swing, E[HS2], best card, implied odds)', ['now', 'rankNow', 'drawEq', 'swing', 'ehs2', 'best', 'up', 'down', 'implied', 'draw', 'pairClass']))
GROUPS += [
    ('+ spread and slope of its equity', ['spread', 'slope']),
    ('+ blockers (his best quarter, his worst quarter, all)', ['bTop', 'bBot', 'bAll']),
    ('+ the spot (bet faced, stack, range and nut advantage, board)', ['faced', 'spr', 'rangeEq', 'nutShare', 'hisNutShare', 'airShare', 'hisAirShare', 'paired', 'maxSuit', 'straighty', 'mainSize', 'nAgg']),
    ("+ his solved answer (blocking his folds or continues, equity when called)", ['bFold', 'bCont', 'eqCalled', 'foldsMain']),
]
def fit(a, b, cols, target):
    m = HistGradientBoostingRegressor(max_iter=80, learning_rate=0.15, max_leaf_nodes=31, min_samples_leaf=40, random_state=0)
    m.fit(a[cols], a[target], sample_weight=a.w)
    return m, np.clip(m.predict(b[cols]), 0, 1)
def r2(y, p, w):
    return 1 - np.sum(w * (y - p) ** 2) / np.sum(w * (y - wmean(y, w)) ** 2)
def cost(b, target, p):
    # what the predicted play gives up against the equilibrium, per hand, as a share of the pot
    if target == 'pAgg': other = b[['gPassive', 'gCall']].min(axis=1); c = p * b.gAgg + (1 - p) * other
    else: c = p * b[['gCall', 'gAgg']].min(axis=1) + (1 - p) * b.gPassive
    return wmean(c.fillna(0), b.w)
print(f"fitted on {train_sets}, scored on {test_sets}\n")
for (kind, position), a in tr.groupby(['kind', 'position']):
    b = te[(te.kind == kind) & (te.position == position)]
    for target in (['pAgg'] if kind == 'open' else ['pCont', 'pAgg']):
        if target == 'pAgg' and a.gAgg.isna().all(): continue
        aa, bb = (a[a.gAgg.notna()], b[b.gAgg.notna()]) if target == 'pAgg' else (a, b)
        if len(bb) == 0: continue
        name = {'pAgg': 'bet or raise', 'pCont': 'continue (call or raise)'}[target]
        print(f"== {kind} {position}: {name}   ({aa.did.nunique()} decisions to fit, {bb.did.nunique()} to score; solver average {wmean(bb[target], bb.w):.2f})")
        cols = []
        for label, extra in GROUPS:
            cols = cols + extra
            m, p = fit(aa, bb, cols, target)
            print(f"   {label:<82} R2 {r2(bb[target], p, bb.w):.3f}   cost {100*cost(bb, target, p):.2f}%")
        # each group on its own on top of the first
        base = GROUPS[0][1]
        print("   on top of rank + frequencies alone:")
        for label, extra in GROUPS[1:]:
            m, p = fit(aa, bb, base + extra, target)
            print(f"      {label:<79} R2 {r2(bb[target], p, bb.w):.3f}   cost {100*cost(bb, target, p):.2f}%")
        # which single features the full model leans on (drop in R2 when one is shuffled)
        m, p = fit(aa, bb, cols, target)
        imp = permutation_importance(m, bb[cols], bb[target], sample_weight=bb.w, n_repeats=1, random_state=0, scoring='r2')
        top = sorted(zip(cols, imp.importances_mean), key=lambda x: -x[1])[:10]
        print("   the full model leans on: " + ', '.join(f"{c} {v:.3f}" for c, v in top))
        print()
