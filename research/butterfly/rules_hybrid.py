# Mixing only where it is free. The tables of rules3.py (one answer a cell: the one that lost least) against the same
# cells played three other ways: as the solver mixes them (rules_mix.py), and in between: a cell keeps its best answer
# unless another answer is within GAP (% of the pot a hand) of it, and then plays those near-equal answers as often as
# the solver does, in quarters. Reported for several GAPs, on flops the table was not made from.
#   STORE=<dir> python3 research/butterfly/rules_hybrid.py   ->  research/butterfly/rules-hybrid.md, rules-hybrid.json
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(HERE, 'rules_mix.py')).read().split("out = open(os.path.join(HERE, 'rules-mix.md')")[0])
KEPT = json.load(open(os.path.join(HERE, 'rules3.json'))); GAPS = [0, 0.2, 0.5, 1.0, 99]
def strategy(loss, sol, n, gap):
    """Each cell's play: the answers within `gap` of the best (per unit of weight), in the solver's proportions, in quarters."""
    near = loss <= loss.min(1, keepdims=True) + gap / 100; f = np.where(near, sol, 0); lone = f.sum(1) <= 1e-9; f[lone] = (loss[lone] == loss[lone].min(1, keepdims=True)).astype(float); f = f / f.sum(1, keepdims=True)
    return quarters(f)
def hybrid(hand, spot, idx, gap, final=False):
    c1, s1 = codes(hand + spot, idx); c0, s0 = codes(hand, idx); fo_h = dfold[dec[idx]]; T = np.zeros((len(idx), 3))
    def cells(c, size, ii):
        one = lambda x: np.bincount(c, weights=x, minlength=size); wt = np.maximum(one(w[ii]), 1e-12)
        return np.column_stack([one(w[ii] * L[ii, k]) for k in range(3)]) / wt[:, None], np.column_stack([one(w[ii] * PG[ii, k]) for k in range(3)]) / wt[:, None], one(np.ones(len(ii))), wt
    if final: l1, f1, n1, wt = cells(c1, s1, idx); return strategy(l1, f1, n1, gap), l1, f1, n1, wt, s1
    for k in range(5):
        tr = fo_h != k; te = ~tr
        if not te.any(): continue
        l1, f1, n1, _ = cells(c1[tr], s1, idx[tr]); l0, f0, n0, _ = cells(c0[tr], s0, idx[tr]); q1 = strategy(l1, f1, n1, gap); q0 = strategy(l0, f0, n0, gap)
        few1 = quarters(f1); q1 = np.where((n1 < MIN)[:, None], few1, q1)                        # a thin cell follows the solver's frequencies
        T[te] = np.where((n1[c1[te]] > 0)[:, None], q1[c1[te]], q0[c0[te]])
    return measure(T, idx, s1)
out = open(os.path.join(HERE, 'rules-hybrid.md'), 'w'); BOOK = {}
def say(*a): print(*a); print(*a, file=out); out.flush()
STREET = ['flop', 'turn', 'river']
say(f'# Mixing only where it is free ({N} decisions, {len(flops)} flops)\n')
say('Each cell plays its best answer, plus any answer within the gap of it, in the solver\'s proportions. Gap 0 is one answer a cell; "all" plays every cell as the solver mixes it. "Differs" is the share of play that is not the solver\'s; "frequency miss" is the distance of the overall share of the second and third answers from the solver\'s, in points.\n')
for nm, kept in KEPT.items():
    s = STREET.index(nm.split(',')[0]); q = 0 if 'out of position' in nm else 1; fi = 'first' in nm; m = (street == s) & (seat == q) & (first == fi); idx = np.where(m[dec])[0]; ANS = kept['answers']
    say(f'\n## {nm}: {" x ".join(kept["names"])} ({m.sum()} decisions; the solver: {ANS[1]} {100 * kept["solver"][0]:.0f}%, {ANS[2]} {100 * kept["solver"][1]:.0f}%)\n'); say('| gap (% pot a hand) | EV lost | P90 | differs | frequency miss | the table\'s own shares: second / third answer |'); say('|---|---|---|---|---|---|')
    rows = {}
    for gp in GAPS:
        r = hybrid(kept['hand'], kept['spot'], idx, gp); T, l1, f1, n1, wt, size = hybrid(kept['hand'], kept['spot'], idx, gp, final=True); sh = (T * wt[:, None]).sum(0) / wt.sum(); rows[gp] = r
        say(f"| {'all' if gp == 99 else gp} | {r['ev']:.2f} | {r['ev90']:.2f} | {r['differs']:.0f} | {r['miss1']:.0f} / {r['miss2']:.0f} | {100 * sh[1]:.0f}% / {100 * sh[2]:.0f}% |")
    T, l1, f1, n1, wt, size = hybrid(kept['hand'], kept['spot'], idx, 0.5, final=True); labels = [kept['labels'][x] for x in kept['names']]; cells = []
    for code in range(size):
        if n1[code] == 0: continue
        parts = []; x = code
        for lab in reversed(labels): parts.append(lab[x % len(lab)]); x //= len(lab)
        cells.append(dict(key=parts[::-1], share=float(wt[code] / wt.sum()), quarters=[int(round(4 * v)) for v in T[code]], solver=[float(v) for v in f1[code]], loss=[float(100 * v) for v in l1[code]], hands=int(n1[code])))
    BOOK[nm] = dict(names=kept['names'], hand=kept['hand'], spot=kept['spot'], labels=kept['labels'], answers=ANS, cells=cells, scores={str(k): v for k, v in rows.items()}, n=int(m.sum()), solver=kept['solver'])
out.close(); json.dump(BOOK, open(os.path.join(HERE, 'rules-hybrid.json'), 'w'), indent=1)
