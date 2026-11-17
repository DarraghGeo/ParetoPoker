# Written rules a person can follow, scored the way the learners were (ev.py): for each of the twelve situations a small
# table. A hand is put in a cell by a few things a player can see or estimate (its row on the chart, its equity band or its
# equity over the price, its draw) and one or two reads of the spot at round thresholds; each cell says act, do not act, or
# either. A cell's call is the one that lost less on the training spots; tables are scored on spots they were not made from
# (five folds by spot). Among the candidate tables of a situation with at most 32 cells, the smallest within 0.02% of the pot
# of the best is kept; the best table of any size is shown beside it.
#   CACHE=cache-v python3 research/butterfly/rules.py   ->  research/butterfly/rules.md, rules.json
import os, sys, json, itertools
HERE = os.path.dirname(os.path.abspath(__file__)); os.environ.setdefault('CACHE', 'cache-v'); os.environ['OUT'] = os.devnull
exec(open(os.path.join(HERE, 'heuristics.py')).read().split('# ================================================================ 1.')[0])
la, lp = Z['la'].astype(np.float64), Z['lp'].astype(np.float64); margin = e - price[dec]
ROWS = ['air', 'draw', 'low pair', 'middle pair', 'top pair', 'overpair', 'two pair', 'trips or better']
band = lambda x, edges: np.digitize(x, edges)
HANDF = {      # name: (code per hand, labels)
    'row': (row, ROWS),
    'equity': (band(e, [.2, .35, .5, .65, .8]), ['under 20%', '20-35%', '35-50%', '50-65%', '65-80%', '80%+']),
    'half': ((frac >= .5).astype(int), ['lower half of its row', 'upper half of its row']),
    'margin': (band(margin, [-.05, 0, .05, .15]), ['5+ under the price', '0-5 under', '0-5 over', '5-15 over', '15+ over']),
    'draw': (np.where(fo >= 9, 3, np.where(so >= 8, 2, np.where(so >= 4, 1, 0))), ['no draw', 'gutshot', 'open-ended', 'flush draw']),
}
SPOTF = {      # name: (code per decision, labels)
    'stack to pot': (band(spr, [2, 6]), ['under 2', '2 to 6', 'over 6']),
    'top pair or better': (band(ra_rows, [-.04, .04]), ['he has more (4+ points)', 'about even', 'I have more (4+ points)']),
    'my range': (band(polar_me, [.4, .65]), ['middling (under 40% at the ends)', 'in between', 'polar (65%+ at the ends)']),
    'his weak hands': (band(his_weak, [.2, .45]), ['under 20% of his range', '20-45%', 'over 45%']),
    'range equity': (band(my_eq, [.45, .55]), ['under 45%', '45-55%', 'over 55%']),
    'who bet last street': (role, ['nobody', 'I did', 'he did']),
}
MIN = 40; EITHER = 0.002; POCKET = int(os.environ.get('POCKET', 32))
def codes(names, hm_idx):
    c = np.zeros(len(hm_idx), dtype=np.int64); size = 1
    for n in names:
        v, labels = HANDF[n] if n in HANDF else (SPOTF[n][0][dec], SPOTF[n][1]); c = c * len(labels) + v[hm_idx]; size *= len(labels)
    return c, size
def table(c, size, idx):
    """For each cell: weight, loss if acting, loss if not, hands, how often the solver acts."""
    return [np.bincount(c, weights=x, minlength=size) for x in (w[idx], w[idx] * la[idx], w[idx] * lp[idx], np.ones(len(idx)), w[idx] * f[idx])]
def calls(t):
    wt, a, p, n, fs = t; few = np.where(fs >= 0.5 * np.maximum(wt, 1e-12), 2, 0)        # a cell with few hands follows what the solver mostly does there
    return np.where(n == 0, -1, np.where(n < MIN, few, np.where(a <= p, 2, 0)))       # 2 act, 0 do not, -1 no hands to say
def run(hand, spot, idx, final=False):
    """EV lost per decision on held-out spots for the table hand x spot, backing off to the hand alone, then to not acting."""
    c1, s1 = codes(hand + spot, idx); c0, s0 = codes(hand, idx); fo_h = dfold[dec[idx]]; pred = np.zeros(len(idx), dtype=int)
    for k in range(5):
        tr = fo_h != k; te = ~tr
        if not te.any(): continue
        k1 = calls(table(c1[tr], s1, idx[tr])); k0 = calls(table(c0[tr], s0, idx[tr])); p = k1[c1[te]]; p = np.where(p < 0, k0[c0[te]], p); pred[te] = np.where(p < 0, 0, p)
    loss = np.where(pred == 2, la[idx], lp[idx]); d = dec[idx]; L = np.bincount(d, weights=w[idx] * loss, minlength=N); tot = np.bincount(d, weights=w[idx], minlength=N); ok = tot > 0; L = 100 * L[ok]
    opp = np.bincount(d, weights=w[idx] * (((pred == 2) & (f[idx] <= .1)) | ((pred == 0) & (f[idx] >= .9))), minlength=N)[ok]
    return dict(mean=L.mean(), p50=np.percentile(L, 50), p90=np.percentile(L, 90), p95=np.percentile(L, 95), over1=np.mean(L > 1), opposite=opp.mean(), cells=s1)
out = open(os.path.join(HERE, 'rules.md'), 'w'); BOOK = {}
say(f'# Written rules, scored on unseen spots ({N} decisions, {len(uniq)} spots)\n')
say('EV lost in percent of the pot per decision. Each table\'s calls are made on four fifths of the spots and scored on the rest.\n')
SUM = []
for s, q, fi in SITS:
    m = sit_mask(s, q, fi); nm = sit_name(s, q, fi); idx = np.where(m[dec])[0]
    if m.sum() < 20: continue
    hands = [['row'], ['row', 'half'], ['equity'], ['row', 'equity']] if fi else [['margin'], ['row', 'margin']]
    if s < 2: hands += [h + ['draw'] for h in hands]
    spots_ = [[]] + [[a] for a in SPOTF] + [list(p) for p in itertools.combinations(SPOTF, 2)]
    res = [(h, sp, run(h, sp, idx)) for h in hands for sp in spots_]
    small = [r for r in res if r[2]['cells'] <= POCKET]; best = min(r[2]['mean'] for r in small); ok = [r for r in small if r[2]['mean'] <= best + 0.02]; pick = min(ok, key=lambda r: (r[2]['cells'], r[2]['mean']))   # a table that fits a page
    plain = min((r for r in res if not r[1]), key=lambda r: r[2]['mean'])
    say(f'\n## {nm} ({m.sum()} decisions)\n'); say('| table | cells | EV lost: mean | median | P90 | P95 | over 1% pot | opposite calls |'); say('|---|---|---|---|---|---|---|---|')
    row_ = lambda tag, r: say(f"| {tag}: {' x '.join(r[0] + r[1])} | {r[2]['cells']} | {r[2]['mean']:.2f} | {r[2]['p50']:.2f} | {r[2]['p90']:.2f} | {r[2]['p95']:.2f} | {100 * r[2]['over1']:.0f}% | {100 * r[2]['opposite']:.1f}% |")
    row_('best of all', min(res, key=lambda r: r[2]['mean'])); row_('**kept**', pick); row_('best with no read of the spot', plain)
    for h in hands[:2]: row_('hand only', (h, [], run(h, [], idx)))
    # the kept table, made from every spot, written out
    names = pick[0] + pick[1]; c, size = codes(names, idx); t = table(c, size, idx); k = calls(t); c0, s0 = codes(pick[0], idx); t0 = table(c0, s0, idx); k0 = calls(t0)
    labels = [HANDF[n][1] if n in HANDF else SPOTF[n][1] for n in names]; cells = []
    for code in range(size):
        if t[3][code] == 0: continue
        parts = []; x = code
        for lab in reversed(labels): parts.append(lab[x % len(lab)]); x //= len(lab)
        wt, a, p = t[0][code], t[1][code], t[2][code]; call = k[code]
        if call < 0: h0 = code // int(np.prod([len(l) for l in labels[len(pick[0]):]]) if pick[1] else 1); call = max(k0[h0], 0)
        either = abs(a - p) / wt < EITHER
        cells.append(dict(key=parts[::-1], share=wt / t[0].sum(), call='either' if either else 'act' if call == 2 else 'no', lean='act' if a <= p else 'no', gap=100 * abs(a - p) / wt, solver=t[4][code] / wt, hands=int(t[3][code])))
    BOOK[nm] = dict(names=names, hand=pick[0], spot=pick[1], labels={n: l for n, l in zip(names, labels)}, cells=cells, score=pick[2], n=int(m.sum()))
    say('\n| ' + ' | '.join(names) + ' | share of range | call | lost by the other call (% pot per hand) | the solver acts |'); say('|' + '---|' * (len(names) + 4))
    for cdef in cells:
        if cdef['share'] >= 0.003: say('| ' + ' | '.join(cdef['key']) + f" | {100 * cdef['share']:.1f}% | {cdef['call']} | {cdef['gap']:.1f} | {100 * cdef['solver']:.0f}% |")
    SUM.append((nm, pick, plain))
say('\n## Summary\n'); say('| situation | the kept table | cells | EV lost: mean | P90 | over 1% pot | opposite calls |'); say('|---|---|---|---|---|---|---|')
for nm, pick, plain in SUM: say(f"| {nm} | {' x '.join(pick[0] + pick[1])} | {pick[2]['cells']} | {pick[2]['mean']:.2f} | {pick[2]['p90']:.2f} | {100 * pick[2]['over1']:.0f}% | {100 * pick[2]['opposite']:.1f}% |")
out.close(); json.dump(BOOK, open(os.path.join(HERE, 'rules.json'), 'w'), indent=1, default=float)
