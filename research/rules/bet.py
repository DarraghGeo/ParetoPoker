# Betting thresholds by street, seat and bet size. A rule bets a hand with equity V or more (value) or under B (bluff), or,
# before the river, with a draw; everything else checks. Its cost is what the cells give up, first order (the solution played
# after), in % of the pot at the decision, weighted by how often the decision arises and the size of the pot.
import sys, numpy as np, itertools, collections
from load import load, wmean
D = [d for d in load() if d['what'] in ('first', 'checkedTo') and 'check' in d['kinds'] and any(k in ('bet', 'allin') for k in d['kinds'])]
print(len(D), 'betting decisions:', collections.Counter((d['street'], d['ip']) for d in D))
VS = np.arange(10, 21) / 20; BS = np.arange(0, 11) / 20
def bets(d): return [(a, d['sizes'][a]) for a, k in enumerate(d['kinds']) if k in ('bet', 'allin')]
def near(d, s): b = bets(d); return min(b, key=lambda x: abs(x[1] - s))
def cost(d, a, V, B, draws=0):
    """Bet with action a from equity V up, under B, and (draws=1: every draw under V; 2: also gutshots and overcards); check the rest."""
    x = d['kinds'].index('check'); Rb = d['R'][a].sum(0); Rx = d['R'][x].sum(0); vi, bi = int(round(V * 20)), int(round(B * 20)); t = 0.0
    for cb in range(3):
        m = np.zeros(20, bool); m[vi:] = True; m[:bi] = True
        if draws and cb >= 3 - draws: m[:vi] = True
        t += Rb[m, cb].sum() + Rx[~m, cb].sum()
    return 100 * t
def freq(d, V, B, draws=0):
    S = d['S'].sum(0); vi, bi = int(round(V * 20)), int(round(B * 20)); t = S[vi:].sum() + S[:bi].sum()
    if draws: t += S[bi:vi, 3 - draws:].sum()
    return t
oracle = lambda d: 100 * np.minimum.reduce([d['R'][a] for a in range(len(d['kinds']))]).sum()
names = {3: 'flop', 4: 'turn', 5: 'river'}
print('\n== The best single pair of thresholds for each street, seat and size (cost in % of the pot; the solution itself and the best possible first)')
for st in (3, 4, 5):
    for ip in (0, 1):
        G = [d for d in D if d['street'] == st and d['ip'] == ip]
        if len(G) < 8: continue
        print(f'{names[st]} {"in position" if ip else "out of position"}: {len(G)} decisions; the solution bets {100*wmean(G, lambda d: 1 - d["freq"][d["kinds"].index("check")]):.0f}%; all check costs {wmean(G, lambda d: 100 * d["R"][d["kinds"].index("check")].sum()):.2f}')
        for s in (0.33, 0.75, 1.25 if st == 3 else 1.5):
            H = [d for d in G if abs(near(d, s)[1] - s) < 0.2]
            if len(H) < 8: continue
            for dr in ((0, 1, 2) if st < 5 else (0,)):
                best = min(((wmean(H, lambda d: cost(d, near(d, s)[0], V, B, dr)), V, B) for V in VS for B in BS if B <= V), key=lambda x: x[0])
                c, V, B = best; formula = 1 - 1 / (2 * (1 + s)); print(f'   size {s:4.2f} ({len(H):4d}){" +draws" if dr == 1 else " +draws and gutshots" if dr == 2 else "":21s}: value from {100*V:3.0f}% (formula {100*formula:.0f}, +8 = {100*formula+8:.0f}), bluff under {100*B:3.0f}%  cost {c:5.2f}  bets {100*wmean(H, lambda d: freq(d, V, B, dr)):3.0f}%'
                      + (f' | value only {wmean(H, lambda d: cost(d, near(d, s)[0], V, 0, 0)):.2f}' if dr == 0 else ''))
