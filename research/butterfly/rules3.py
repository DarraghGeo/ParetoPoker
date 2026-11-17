# Written rules with three answers, made from poker-huerosolver's stored solves (store.mjs, store_cache.py), where every
# street has raises. First to act: check / bet / bet big (over the pot). Facing a bet or a raise: fold / call / raise.
# A hand is put in a cell by what a player can see or estimate; the cell's answer is the one that lost least on the
# training flops; tables are scored on flops they were not made from (five folds by flop). Among tables of at most
# POCKET cells the smallest within 0.02% of the pot of the best is kept.
#   STORE=<dir> python3 research/butterfly/rules3.py   ->  research/butterfly/rules3.md, rules3.json
import os, sys, json, itertools
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); STORE = os.environ['STORE']
Z = np.load(os.path.join(STORE, 'cache3.npz')); D = json.load(open(os.path.join(STORE, 'cache3-decisions.json'))); N = len(D)
dec, w, e, row, draw = Z['dec'], Z['w'].astype(np.float64), Z['e'].astype(np.float64), Z['row'], Z['draw']; L = np.column_stack([Z['l0'], Z['l1'], Z['l2']]).astype(np.float64); PG = np.column_stack([1 - Z['p1'] - Z['p2'], Z['p1'], Z['p2']]).astype(np.float64)
g = lambda key: np.array([d[key] for d in D]); street, seat, first = g('street'), g('seat'), g('first'); price = g('price'); margin = e - price[dec]
flops = sorted(set(g('flop'))); rng = np.random.default_rng(3); fold_of = {f: k % 5 for k, f in zip(rng.permutation(len(flops)), flops)}; dfold = np.array([fold_of[d['flop']] for d in D])
band = lambda x, edges: np.digitize(x, edges)
ROWS = ['air', 'draw', 'low pair', 'middle pair', 'top pair', 'overpair', 'two pair', 'trips or better']
HANDF = {'row': (row, ROWS), 'equity': (band(e, [.2, .35, .5, .65, .8]), ['under 20%', '20-35%', '35-50%', '50-65%', '65-80%', '80%+']),
         'margin': (band(margin, [-.05, 0, .05, .15, .3]), ['5+ under the price', '0-5 under', '0-5 over', '5-15 over', '15-30 over', '30+ over']), 'draw': (draw, ['no draw', 'gutshot', 'open-ended', 'flush draw'])}
SPOTF = {'stack to pot': (band(g('spr'), [2, 6]), ['under 2', '2 to 6', 'over 6']), 'top pair or better': (band(g('tp_lead'), [-.04, .04]), ['he has more', 'about even', 'I have more']),
         'my range': (band(g('my_ends'), [.4, .65]), ['middling', 'in between', 'polar']), 'his weak hands': (band(g('his_weak'), [.2, .45]), ['under 20%', '20-45%', 'over 45%']),
         'range equity': (band(g('my_eq'), [.45, .55]), ['under 45%', '45-55%', 'over 55%']), 'who bet last street': (np.array([['none', 'led', 'followed'].index(x) for x in g('role')]), ['nobody', 'I did', 'he did']),
         'what I face': (np.array([['none', 'bet', 'raise'].index(x) for x in g('faced')]), ['-', 'a bet', 'a raise'])}
MIN = 40; EITHER = 0.002; POCKET = int(os.environ.get('POCKET', 32))
def codes(names, idx):
    c = np.zeros(len(idx), dtype=np.int64); size = 1
    for n in names:
        v, labels = HANDF[n] if n in HANDF else (SPOTF[n][0][dec], SPOTF[n][1]); c = c * len(labels) + v[idx]; size *= len(labels)
    return c, size
def table(c, size, idx):
    """For each cell: weight, the loss of each answer, hands, how often the solver gives each answer."""
    one = lambda x: np.bincount(c, weights=x, minlength=size)
    return one(w[idx]), np.column_stack([one(w[idx] * L[idx, k]) for k in range(3)]), one(np.ones(len(idx))), np.column_stack([one(w[idx] * PG[idx, k]) for k in range(3)])
def calls(t, allow):
    wt, loss, n, sol = t; best = np.argmin(loss[:, allow], axis=1); few = np.argmax(sol[:, allow], axis=1); pick = np.where(n < MIN, few, best)
    return np.where(n == 0, -1, np.array(allow)[pick])
def run(hand, spot, idx, allow=(0, 1, 2)):
    c1, s1 = codes(hand + spot, idx); c0, s0 = codes(hand, idx); fo_h = dfold[dec[idx]]; pred = np.zeros(len(idx), dtype=int); allow = list(allow)
    for k in range(5):
        tr = fo_h != k; te = ~tr
        if not te.any(): continue
        k1 = calls(table(c1[tr], s1, idx[tr]), allow); k0 = calls(table(c0[tr], s0, idx[tr]), allow); p = k1[c1[te]]; p = np.where(p < 0, k0[c0[te]], p); pred[te] = np.where(p < 0, 0, p)
    return score(pred, idx, s1)
def score(pred, idx, cells=0):
    loss = L[idx, pred] if not np.isscalar(pred) else L[idx, pred]; d = dec[idx]; tot = np.bincount(d, weights=w[idx], minlength=N); ok = tot > 0; Ld = 100 * np.bincount(d, weights=w[idx] * loss, minlength=N)[ok]
    return dict(mean=float(Ld.mean()), p50=float(np.percentile(Ld, 50)), p90=float(np.percentile(Ld, 90)), p95=float(np.percentile(Ld, 95)), over1=float(np.mean(Ld > 1)), cells=cells)
out = open(os.path.join(HERE, 'rules3.md'), 'w')
def say(*a): print(*a); print(*a, file=out); out.flush()
STREET = ['flop', 'turn', 'river']; SEAT = ['out of position', 'in position']; BOOK = {}; SUM = []
say(f'# Three-answer rules from the stored solves with raises ({N} decisions, {len(flops)} flops)\n')
say('EV lost in percent of the pot per decision, on flops the table was not made from. Flop and turn: the full hands (bets 33/75% flop, 75% turn, all-in, one 3x raise). River: bets 33/75/150%, all-in, two 3x raises.\n')
for fi in (False, True):
    for s in (2, 1, 0):
        for q in (0, 1):
            m = (street == s) & (seat == q) & (first == fi); nm = f"{STREET[s]}, {SEAT[q]}, {'first to act' if fi else 'facing a bet'}"; idx = np.where(m[dec])[0]
            if m.sum() < 20: continue
            ANS = ['check', 'bet', 'bet big'] if fi else ['fold', 'call', 'raise']
            hands = [['row'], ['equity'], ['row', 'equity']] if fi else [['margin'], ['row', 'margin']]
            if s < 2: hands += [h + ['draw'] for h in hands]
            reads = [k for k in SPOTF if (k != 'what I face' or not fi)]; spots_ = [[]] + [[a] for a in reads] + [list(p) for p in itertools.combinations(reads, 2)]
            res = [(h, sp, run(h, sp, idx)) for h in hands for sp in spots_]
            small = [r for r in res if r[2]['cells'] <= POCKET]; best = min(r[2]['mean'] for r in small); pick = min([r for r in small if r[2]['mean'] <= best + 0.02], key=lambda r: (r[2]['cells'], r[2]['mean'])); top = min(res, key=lambda r: r[2]['mean'])
            two = run(pick[0], pick[1], idx, allow=(0, 1)); base = [score(np.full(len(idx), k), idx) for k in range(3)]
            say(f'\n## {nm} ({m.sum()} decisions; the solver: {ANS[1]} {100 * np.mean([D[k]["act1"] for k in np.where(m)[0]]):.0f}%, {ANS[2]} {100 * np.mean([D[k]["act2"] for k in np.where(m)[0]]):.0f}%)\n')
            say('| table | cells | EV lost: mean | median | P90 | P95 | over 1% pot |'); say('|---|---|---|---|---|---|---|')
            line = lambda tag, r: say(f"| {tag} | {r['cells']} | {r['mean']:.2f} | {r['p50']:.2f} | {r['p90']:.2f} | {r['p95']:.2f} | {100 * r['over1']:.0f}% |")
            line(f"**kept**: {' x '.join(pick[0] + pick[1])}", pick[2]); line(f"best of any size: {' x '.join(top[0] + top[1])}", top[2]); line(f'the kept table without "{ANS[2]}"', two)
            for k in range(3): line(f'always {ANS[k]}', base[k])
            names = pick[0] + pick[1]; c, size = codes(names, idx); t = table(c, size, idx); kk = calls(t, [0, 1, 2]); labels = [HANDF[n][1] if n in HANDF else SPOTF[n][1] for n in names]; cells = []
            for code in range(size):
                if t[2][code] == 0: continue
                parts = []; x = code
                for lab in reversed(labels): parts.append(lab[x % len(lab)]); x //= len(lab)
                ls = t[1][code] / t[0][code]; o = np.argsort(ls); cells.append(dict(key=parts[::-1], share=float(t[0][code] / t[0].sum()), call=ANS[int(kk[code])], second=ANS[int(o[1])] if int(kk[code]) == int(o[0]) else ANS[int(o[0])],
                    either=bool(ls[o[1]] - ls[o[0]] < EITHER), gap=float(100 * (ls[o[1]] - ls[o[0]])), solver=[float(x) for x in t[3][code] / t[0][code]], hands=int(t[2][code])))
            BOOK[nm] = dict(names=names, hand=pick[0], spot=pick[1], labels={n: l for n, l in zip(names, labels)}, answers=ANS, cells=cells, score=pick[2], n=int(m.sum()), best=dict(names=top[0] + top[1], **top[2]), two=two, always=base,
                            solver=[float(np.mean([D[k]['act1'] for k in np.where(m)[0]])), float(np.mean([D[k]['act2'] for k in np.where(m)[0]]))])
            say('\n| ' + ' | '.join(names) + f' | share | answer | next best | gap (% pot a hand) | solver: {ANS[0]} / {ANS[1]} / {ANS[2]} |'); say('|' + '---|' * (len(names) + 5))
            for cdef in cells:
                if cdef['share'] >= 0.003: say('| ' + ' | '.join(cdef['key']) + f" | {100 * cdef['share']:.1f}% | {cdef['call']} | {cdef['second']} | {cdef['gap']:.1f} | " + ' / '.join(f'{100 * x:.0f}' for x in cdef['solver']) + ' |')
            SUM.append((nm, pick, two, base, top))
say('\n## Summary\n'); say('| situation | the kept table | cells | EV lost: mean | P90 | without the third answer | best of any size | always fold or check | always call or bet |'); say('|---|---|---|---|---|---|---|---|---|')
for nm, pick, two, base, top in SUM: say(f"| {nm} | {' x '.join(pick[0] + pick[1])} | {pick[2]['cells']} | {pick[2]['mean']:.2f} | {pick[2]['p90']:.2f} | {two['mean']:.2f} | {top[2]['mean']:.2f} | {base[0]['mean']:.2f} | {base[1]['mean']:.2f} |")
out.close(); json.dump(BOOK, open(os.path.join(HERE, 'rules3.json'), 'w'), indent=1)
