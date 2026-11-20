"""River, first to act: inside one cell of the lookup (category x equity band x nut advantage), does a characteristic of
the hand split it? In each spot the cell's hands are ranked by a characteristic; the top part takes one action and the
rest another. Share: the part of the cell that bets (0.33, 0.5, 0.67).   python3 split.py <file> <first-oop|first-ip>"""
import sys, collections
from category import load, TOL, ORDER, FEATS
from lookup import KEYS, ACTS, eband
names = ['category', 'equity', 'nut advantage']; spots = [d for d in load(sys.argv[1], sys.argv[2]) if d['nbets'] >= 3 and d['kinds'][1:4] == ['bet', 'bet', 'bet']]
cells = collections.defaultdict(list)
for i, d in enumerate(spots):
    by = collections.defaultdict(list)
    for h in d['hands']: by[tuple(KEYS[n](d, h) for n in names)].append(h)
    for k, hs in by.items(): cells[k].append((i, d, hs))
W = sum(h['w'] for d in spots for h in d['hands']); feats = FEATS + ['sub_pair']
def run(groups, plan):
    L = Wt = over = 0.0
    for i, d, hs in groups:
        for h, a in plan(d, hs):
            for act, w in a: loss = max(h['v'][:4]) - h['v'][act]; L += w * loss; Wt += w; over += w * (loss > TOL)
    return (L / Wt, over / Wt) if Wt else (0, 0)
for k in sorted(cells, key=lambda k: (ORDER.index(k[0]), k[1], k[2])):
    groups = cells[k]; w = sum(h['w'] for _, _, hs in groups for h in hs)
    if w / W < 0.008: continue
    base = [run(groups, lambda d, hs, j=j: [(h, [(j, h['w'])]) for h in hs]) for j in range(4)]; j0 = min(range(4), key=lambda j: base[j][0])
    solver = [sum(h['w'] * h['p'][j] for _, _, hs in groups for h in hs) / w for j in range(4)]
    line = f"{' | '.join(k):32s} {100 * w / W:4.1f}% of range, solver {'/'.join(f'{100 * x:.0f}' for x in solver)}: one action = {ACTS[j0]} {base[j0][0]:.2f} ({100 * base[j0][1]:.0f}% over)"
    if base[j0][0] < 0.25: print(line); continue
    best = (base[j0][0], None)
    for f in feats:
        for sign in (1, -1):
            for share in (0.33, 0.5, 0.67):
                for a_hi in (1, 2, 3):
                    def plan(d, hs, f=f, sign=sign, share=share, a_hi=a_hi):
                        key = (lambda h: h['row'] > 1 or h['pair']) if f == 'sub_pair' else (lambda h: h.get(f) if h.get(f) is not None else 0)
                        order = sorted(hs, key=lambda h: -sign * key(h)); need = share * sum(h['w'] for h in hs); out = []
                        for h in order: t = min(h['w'], max(need, 0)); need -= t; out.append((h, [(a_hi, t), (0, h['w'] - t)]))
                        return out
                    odd = [g for g in groups if g[0] % 2]; even = [g for g in groups if not g[0] % 2]
                    r = run(even, plan)
                    if r[0] < best[0] - 0.02: best = (r[0], (f, sign, share, a_hi, run(odd, plan), run(odd, lambda d, hs: [(h, [(j0, h['w'])]) for h in hs])))
    if best[1]: f, sign, share, a_hi, test, plain = best[1]; line += f"\n      split: the {int(100 * share)}% with the {'highest' if sign > 0 else 'lowest'} {f} bet {ACTS[a_hi]}, rest check -> held-out spots {test[0]:.2f} ({100 * test[1]:.0f}% over) against {plain[0]:.2f} ({100 * plain[1]:.0f}%) for one action"
    print(line)
