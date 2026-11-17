# Written rules that keep the solver's mixing. As rules3.py (three answers, the stored solves with raises), but a cell
# does not take the one answer that lost least: it plays the answers as often as the solver does with those hands, in
# quarters (0, 25, 50, 75, 100%). A table is judged by how close its play is to the solver's hand by hand (the share of
# play that differs), and reported with its EV lost and how far its overall frequencies are from the solver's.
# Among tables of at most POCKET cells the smallest within one point of the closest is kept.
#   STORE=<dir> python3 research/butterfly/rules_mix.py   ->  research/butterfly/rules-mix.md, rules-mix.json
import os, sys, json, itertools
HERE = os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(HERE, 'rules3.py')).read().split("MIN = 40")[0])
frac = Z['frac'].astype(np.float64); HANDF['half'] = ((frac >= .5).astype(int), ['lower half of its row', 'upper half of its row'])
MIN = 40; POCKET = int(os.environ.get('POCKET', 36))
def codes(names, idx):
    c = np.zeros(len(idx), dtype=np.int64); size = 1
    for n in names:
        v, labels = HANDF[n] if n in HANDF else (SPOTF[n][0][dec], SPOTF[n][1]); c = c * len(labels) + v[idx]; size *= len(labels)
    return c, size
def quarters(fr):
    """Frequencies rounded to quarters that still add to one (largest remainders)."""
    x = fr * 4; lo = np.floor(x + 1e-9); left = (4 - lo.sum(1)).astype(int); rem = x - lo; order = np.argsort(-rem, axis=1)
    for k in range(fr.shape[1]): lo[np.arange(len(lo)), order[:, k]] += (left > k)
    return lo / 4
def cells_of(c, size, idx):
    one = lambda x: np.bincount(c, weights=x, minlength=size); wt = one(w[idx]); n = one(np.ones(len(idx))); sol = np.column_stack([one(w[idx] * PG[idx, k]) for k in range(3)]) / np.maximum(wt, 1e-12)[:, None]
    return wt, n, sol
def run(hand, spot, idx, exact=False):
    c1, s1 = codes(hand + spot, idx); c0, s0 = codes(hand, idx); fo_h = dfold[dec[idx]]; T = np.zeros((len(idx), 3))
    for k in range(5):
        tr = fo_h != k; te = ~tr
        if not te.any(): continue
        w1, n1, f1 = cells_of(c1[tr], s1, idx[tr]); w0, n0, f0 = cells_of(c0[tr], s0, idx[tr]); allf = (w[idx[tr], None] * PG[idx[tr]]).sum(0) / w[idx[tr]].sum()
        q1 = f1 if exact else quarters(f1); q0 = f0 if exact else quarters(f0); t = np.where((n1[c1[te]] >= MIN)[:, None], q1[c1[te]], np.where((n0[c0[te]] >= MIN)[:, None], q0[c0[te]], allf[None, :])); T[te] = t
    return measure(T, idx, s1)
def measure(T, idx, cells=0):
    d = dec[idx]; per = lambda x: np.bincount(d, weights=w[idx] * x, minlength=N); tot = per(np.ones(len(idx))); ok = tot > 0
    ev = 100 * per((T * L[idx]).sum(1))[ok]; tv = 100 * per(0.5 * np.abs(T - PG[idx]).sum(1))[ok]; fm = [100 * np.abs(per(T[:, k]) - per(PG[idx, k]))[ok] for k in (1, 2)]
    return dict(ev=float(ev.mean()), ev90=float(np.percentile(ev, 90)), differs=float(tv.mean()), differs90=float(np.percentile(tv, 90)), miss1=float(fm[0].mean()), miss2=float(fm[1].mean()), cells=cells)
def pure(hand, spot, idx):
    """The table that takes the least-losing answer in each cell (rules3.py), measured the same way."""
    c1, s1 = codes(hand + spot, idx); fo_h = dfold[dec[idx]]; T = np.zeros((len(idx), 3))
    for k in range(5):
        tr = fo_h != k; te = ~tr
        if not te.any(): continue
        loss = np.column_stack([np.bincount(c1[tr], weights=w[idx[tr]] * L[idx[tr], j], minlength=s1) for j in range(3)]); T[np.where(te)[0], np.argmin(loss, 1)[c1[te]]] = 1
    return measure(T, idx, s1)
out = open(os.path.join(HERE, 'rules-mix.md'), 'w')
def say(*a): print(*a); print(*a, file=out); out.flush()
STREET = ['flop', 'turn', 'river']; SEAT = ['out of position', 'in position']; BOOK = {}; SUM = []
say(f'# Rules that keep the solver\'s mixing ({N} decisions, {len(flops)} flops)\n')
say('"Differs" is the share of play that is not the solver\'s, hand by hand, in points (0 = the solver\'s own strategy). "EV lost" is in percent of the pot per decision. "Frequency miss" is how far the table\'s overall share of an answer is from the solver\'s, in points of the range. All on flops the table was not made from.\n')
for fi in (False, True):
    for s in (2, 1, 0):
        for q in (0, 1):
            m = (street == s) & (seat == q) & (first == fi); nm = f"{STREET[s]}, {SEAT[q]}, {'first to act' if fi else 'facing a bet'}"; idx = np.where(m[dec])[0]
            if m.sum() < 20: continue
            ANS = ['check', 'bet', 'bet big'] if fi else ['fold', 'call', 'raise']
            hands = [['row'], ['equity'], ['row', 'equity'], ['row', 'half'], ['equity', 'half']] if fi else [['margin'], ['row', 'margin'], ['margin', 'half']]
            if s < 2: hands += [h + ['draw'] for h in hands if len(h) < 3]
            reads = [k for k in SPOTF if (k != 'what I face' or not fi)]; spots_ = [[]] + [[a] for a in reads]
            res = [(h, sp, run(h, sp, idx)) for h in hands for sp in spots_]
            small = [r for r in res if r[2]['cells'] <= POCKET]; best = min(r[2]['differs'] for r in small); pick = min([r for r in small if r[2]['differs'] <= best + 1.0], key=lambda r: (r[2]['cells'], r[2]['differs'])); top = min(res, key=lambda r: r[2]['differs'])
            exact = run(pick[0], pick[1], idx, exact=True); one = pure(pick[0], pick[1], idx); sol = [float(np.mean([D[k]['act1'] for k in np.where(m)[0]])), float(np.mean([D[k]['act2'] for k in np.where(m)[0]]))]
            say(f'\n## {nm} ({m.sum()} decisions; the solver: {ANS[1]} {100 * sol[0]:.0f}%, {ANS[2]} {100 * sol[1]:.0f}%)\n')
            say(f'| table | cells | differs | P90 | EV lost | P90 | frequency miss: {ANS[1]} | {ANS[2]} |'); say('|---|---|---|---|---|---|---|---|')
            line = lambda tag, r: say(f"| {tag} | {r['cells']} | {r['differs']:.0f} | {r['differs90']:.0f} | {r['ev']:.2f} | {r['ev90']:.2f} | {r['miss1']:.0f} | {r['miss2']:.0f} |")
            line(f"**kept**, in quarters: {' x '.join(pick[0] + pick[1])}", pick[2]); line('the same cells with the solver\'s exact frequencies', exact); line('the same cells, one answer each (least EV lost)', one); line(f"closest of any size: {' x '.join(top[0] + top[1])}", top[2])
            names = pick[0] + pick[1]; c, size = codes(names, idx); wt, n, f = cells_of(c, size, idx); qq = quarters(f); labels = [HANDF[x][1] if x in HANDF else SPOTF[x][1] for x in names]; cells = []
            for code in range(size):
                if n[code] == 0: continue
                parts = []; x = code
                for lab in reversed(labels): parts.append(lab[x % len(lab)]); x //= len(lab)
                cells.append(dict(key=parts[::-1], share=float(wt[code] / wt.sum()), quarters=[int(round(4 * v)) for v in qq[code]], solver=[float(v) for v in f[code]], hands=int(n[code])))
            BOOK[nm] = dict(names=names, hand=pick[0], spot=pick[1], labels={x: l for x, l in zip(names, labels)}, answers=ANS, cells=cells, score=pick[2], exact=exact, pure=one, n=int(m.sum()), solver=sol)
            say('\n| ' + ' | '.join(names) + f' | share | {ANS[0]} / {ANS[1]} / {ANS[2]} (quarters) | the solver |'); say('|' + '---|' * (len(names) + 3))
            for cd in cells:
                if cd['share'] >= 0.003: say('| ' + ' | '.join(cd['key']) + f" | {100 * cd['share']:.1f}% | " + ' / '.join(str(25 * v) for v in cd['quarters']) + ' | ' + ' / '.join(f'{100 * v:.0f}' for v in cd['solver']) + ' |')
            SUM.append((nm, pick, one, ANS))
say('\n## Summary\n'); say('| situation | the kept table | cells | differs | EV lost | P90 | frequency miss (second answer / third) | one answer a cell: differs | EV lost |'); say('|---|---|---|---|---|---|---|---|---|')
for nm, pick, one, ANS in SUM: say(f"| {nm} | {' x '.join(pick[0] + pick[1])} | {pick[2]['cells']} | {pick[2]['differs']:.0f} | {pick[2]['ev']:.2f} | {pick[2]['ev90']:.2f} | {pick[2]['miss1']:.0f} / {pick[2]['miss2']:.0f} | {one['differs']:.0f} | {one['ev']:.2f} |")
out.close(); json.dump(BOOK, open(os.path.join(HERE, 'rules-mix.json'), 'w'), indent=1)
