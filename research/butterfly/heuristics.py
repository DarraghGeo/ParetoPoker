# The chart with heuristics and calculations: what each adds, situation by situation.
# On the stored solved decisions (cache.py), for each of twelve situations (street x seat x first to act / facing a bet):
#   1. How often the range acts: how close each way of estimating it comes (a fixed figure, who led, the "book share"
#      calculation, the "world" reading, the flop c-bet ramp, a small tree on what is seen, a strong learner on everything).
#   2. A rulebook with nothing fitted (the book share and a value line first to act; the price and minimum defence facing
#      a bet): how much of the range it calls right as Always / Mix / Never.
#   3. A learner given the chart, then the heuristic that helps most, then the next: the order they come in and where the
#      gains stop. Also the heuristics without the chart (the spot alone; the spot and the hand's made class), to see what
#      the chart itself is worth.
# The heuristics and calculations are those of poker-huerosolver and napkinpoker, in the form a player could apply.
#   python3 research/butterfly/heuristics.py [quick]      -> research/butterfly/heuristics.md
import json, os, sys, collections, time
import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier, HistGradientBoostingRegressor
from sklearn.tree import DecisionTreeRegressor
from sklearn.model_selection import GroupKFold
HERE = os.path.dirname(os.path.abspath(__file__)); QUICK = len(sys.argv) > 1 and sys.argv[1] == 'quick'
Z = np.load(os.path.join(HERE, 'cache.npz')); D = json.load(open(os.path.join(HERE, 'cache-decisions.json'))); N = len(D)
dec, w, e, f, row, frac, grank = Z['dec'], Z['w'].astype(np.float64), Z['e'].astype(np.float64), Z['f'].astype(np.float64), Z['row'], Z['frac'], Z['grank']
draw, fo, so, now, pocket = Z['draw'], Z['fo'], Z['so'], Z['now'], Z['pocket']
kind = np.where(f >= 0.9, 2, np.where(f <= 0.1, 0, 1))
per = lambda x: np.bincount(dec, weights=x, minlength=N)          # a sum over each decision's hands (weights already add to 1 a decision)
g = lambda key: np.array([d[key] for d in D])
street, seat, first, spr = g('street'), g('seat'), g('first'), np.minimum(g('spr'), 20.0)
role = np.array([['none', 'led', 'followed'].index(d['role']) for d in D]); pot_type = np.array([['SRP', '3BP', '4BP', 'Squeeze'].index(d['pot_type']) if d['pot_type'] in ('SRP', '3BP', '4BP', 'Squeeze') else 4 for d in D])
act, mixing = g('act'), g('mix'); my_eq = g('my_eq'); MB = np.array([d['my_bands'] for d in D]); HB = np.array([d['his_bands'] for d in D]); MR = np.array([d['my_rows'] for d in D]); HR = np.array([d['his_rows'] for d in D])
price, betf, main_size, small = g('price'), g('bet'), g('main_size'), g('small'); paired, suits, high = g('paired').astype(float), g('suits').astype(float), g('high').astype(float)
spots = g('spot')

# ---- the readings and calculations, a number a decision ----
LINE = 1 - (1 / 1.75) / 2                                         # a value bet of three quarters of the pot beats half of what calls it: 71% of his range
V = per(w * (e >= LINE)); A = per(w * (e < 0.2)); RATIO = 0.75 / 1.75
book = V + np.minimum(V * RATIO, A)                               # the book share: value, and bluffs at the bet's ratio, no more than the air there is
Vh = HB[:, 5] + HB[:, 4] * (0.8 - LINE) / 0.15; Ah = HB[:, 0]; bookh = Vh + np.minimum(Vh * RATIO, Ah)
lead = book - bookh
f_book = np.where(seat == 1, book, np.maximum(0, lead))          # in position the book share; out of position only the lead over his
f_book = np.where((street == 0) & (seat == 0) & (lead >= small / (1 + 2 * small)) & (small > 0), 1.0, f_book)   # flop, out of position: the whole range once the lead reaches the small bet's price
nut_adv = MB[:, 5] - HB[:, 5]; my_strong, his_strong, my_weak, his_weak = MB[:, 5], HB[:, 5], MB[:, 0] + MB[:, 1], HB[:, 0] + HB[:, 1]
world = 0.5 + (my_eq - 0.5) + np.where(seat == 1, 0.03, -0.03) + 0.25 * nut_adv * np.clip(spr / 3, 0.4, 1)
f_world = np.select([world >= 0.64, world >= 0.56, world >= 0.46, world >= 0.40], [0.70, 0.60, 0.34, 0.20], 0.10)
f_ramp = np.clip(0.15 + (my_eq - 0.52) / 0.06 * 0.85, 0.15, 1.0)
polar_me = (MB[:, 0] + MB[:, 1] + MB[:, 5]); polar_him = (HB[:, 0] + HB[:, 1] + HB[:, 5]); his_mid = HB[:, 2] + HB[:, 3]
ra_rows = MR[:, 4:].sum(1) - HR[:, 4:].sum(1); na_rows = MR[:, 6:].sum(1) - HR[:, 6:].sum(1)
mdf = 1 / (1 + np.maximum(betf, 1e-9)); mdf2e = mdf * np.minimum(1, 2 * my_eq)

fold_of = {}; rng = np.random.default_rng(3); uniq = sorted(set(spots))
for k, s in enumerate(rng.permutation(len(uniq))): fold_of[uniq[s]] = k % 5
dfold = np.array([fold_of[s] for s in spots])
out = open(os.path.join(HERE, 'heuristics.md'), 'w')
def say(*a):
    print(*a); print(*a, file=out); out.flush()
STREET = ['flop', 'turn', 'river']; SEAT = ['out of position', 'in position']; ROLE = ['nobody led', 'led', 'followed']
SITS = [(s, q, fi) for fi in (True, False) for s in range(3) for q in range(2)]
sit_name = lambda s, q, fi: f"{STREET[s]}, {SEAT[q]}, {'first to act' if fi else 'facing a bet'}"
sit_mask = lambda s, q, fi: (street == s) & (seat == q) & (first == fi)

# ================================================================ 1. how often the range acts
say(f'# The chart with heuristics and calculations ({N} solved decisions, {len(uniq)} spots)\n')
say('## 1. How often the range acts: how close each estimate comes\n')
say('Typical miss in points of the range (mean), with the P90 in brackets. Learnt estimates are made on other spots (five folds by spot).\n')
def cv_pred(X, y, m, model):
    p = np.zeros(m.sum()); idx = np.where(m)[0]
    for fo_ in range(5):
        te = dfold[idx] == fo_; tr = ~te
        if te.sum() == 0 or tr.sum() < 5: p[te] = y[idx].mean(); continue
        p[te] = model().fit(X[idx][tr], y[idx][tr]).predict(X[idx][te])
    return p
SEEN = np.column_stack([role, pot_type, spr, paired, suits, high]); READ = np.column_stack([my_eq, nut_adv, my_strong, his_strong, his_weak, my_weak, polar_me, polar_him, ra_rows, na_rows])
CALC = np.column_stack([book, bookh, lead, f_book, world]); ALL = np.column_stack([SEEN, READ, CALC])
cols = ['one figure for the situation', 'by who led', 'book share (calculated)', 'world reading', 'small tree: what is seen', 'small tree: seen + range and nut advantage', 'small tree: seen + book share and lead', 'strong learner: everything']
say('| first to act | decisions | bets on average | ' + ' | '.join(cols) + ' |'); say('|---|---|---|' + '---|' * len(cols))
miss = lambda p, y: f'{100 * np.mean(np.abs(p - y)):.0f} ({100 * np.percentile(np.abs(p - y), 90):.0f})'
FREQ = {}
for s in range(3):
    for q in range(2):
        m = sit_mask(s, q, True); y = act[m]; idx = np.where(m)[0]; cells = []
        const = cv_pred(np.zeros((N, 1)), act, m, lambda: DecisionTreeRegressor(max_depth=1)); cells.append(miss(const, y))
        cells.append(miss(cv_pred(role.reshape(-1, 1).astype(float), act, m, lambda: DecisionTreeRegressor(max_depth=3)), y))
        cells.append(miss(f_book[m], y)); cells.append(miss(f_world[m], y) if s < 2 else '-')
        tree = lambda: DecisionTreeRegressor(max_depth=3, min_samples_leaf=15)
        cells.append(miss(cv_pred(SEEN, act, m, tree), y)); cells.append(miss(cv_pred(np.column_stack([SEEN, my_eq, nut_adv]), act, m, tree), y)); p_tree = cv_pred(np.column_stack([SEEN, book, lead]), act, m, tree); cells.append(miss(p_tree, y))
        p_all = cv_pred(ALL, act, m, lambda: HistGradientBoostingRegressor(max_iter=150, learning_rate=0.08)); cells.append(miss(p_all, y)); FREQ[(s, q)] = (idx, p_tree, p_all)
        say(f'| {STREET[s]}, {SEAT[q]} | {m.sum()} | {100 * y.mean():.0f}% | ' + ' | '.join(cells) + ' |')
f_tree = np.full(N, np.nan); f_all = np.full(N, np.nan)
for (s, q), (idx, pt, pa) in FREQ.items(): f_tree[idx] = pt; f_all[idx] = pa
say('\nFlop, the raiser\'s bet by the c-bet ramp (15% at 52% range equity to 100% at 58%): ' + ', '.join(f"{SEAT[q]} {miss(f_ramp[m], act[m])}" for q in range(2) for m in [sit_mask(0, q, True) & (role == 1)]))
say('\n| facing a bet | decisions | continues on average | one figure | minimum defence | min. defence x min(1, 2 x range equity) | small tree: price, size, who led | strong learner: everything |'); say('|---|---|---|---|---|---|---|---|')
for s in range(3):
    for q in range(2):
        m = sit_mask(s, q, False); y = act[m]
        const = cv_pred(np.zeros((N, 1)), act, m, lambda: DecisionTreeRegressor(max_depth=1)); Xf = np.column_stack([price, betf, role, spr, my_eq])
        say(f'| {STREET[s]}, {SEAT[q]} | {m.sum()} | {100 * y.mean():.0f}% | {miss(const, y)} | {miss(mdf[m], y)} | {miss(mdf2e[m], y)} | {miss(cv_pred(Xf, act, m, lambda: DecisionTreeRegressor(max_depth=3, min_samples_leaf=15)), y)} | {miss(cv_pred(np.column_stack([ALL, price, betf]), act, m, lambda: HistGradientBoostingRegressor(max_iter=150, learning_rate=0.08)), y)} |')

# ================================================================ 2. the rulebook, nothing fitted
say('\n## 2. A rulebook with nothing fitted\n')
say('First to act: the range bets its book share (in position), or its lead over his (out of position; the whole range on the flop once the lead reaches the small bet\'s price). Value is a hand that beats 71% of his range; bluffs come from the hands under 20%, as many as the ratio allows; the rest check. Facing a bet: on the river continue with the price; before it continue with the top of the range down to minimum defence (in position) or minimum defence x min(1, 2 x range equity) (out of position), and never below the price. A hand within 3 points of a line is called a mix.\n')
kd = lambda x: np.where(x >= 0.9, 2, np.where(x <= 0.1, 0, 1))
qv = np.where(book > 1e-9, np.clip(f_book / np.maximum(book, 1e-9), 0, 1), 0)              # how much of the betting range bets (all of it in position)
qb = np.where(A > 1e-9, np.clip(np.minimum(V * RATIO, A) / np.maximum(A, 1e-9), 0, 1), 0) * qv
r_first = np.where(e >= LINE + 0.03, kd(qv[dec]), np.where(e >= LINE - 0.03, 1, np.where(e < 0.2, kd(qb[dec]), 0)))
r_first = np.where(f_book[dec] >= 0.9, 2, np.where(f_book[dec] <= 0.05, 0, r_first))
thr = np.where(street == 2, 0.0, np.where(seat == 1, 1 - mdf, 1 - mdf2e))                 # the place in the range a hand must reach before the river
margin = e - price[dec]
r_face = np.where(street[dec] == 2, np.where(margin >= 0.03, 2, np.where(margin <= -0.03, 0, 1)),
                  np.where(margin < -0.03, 0, np.where(grank >= thr[dec] + 0.04, 2, np.where(grank <= thr[dec] - 0.04, 0, 1))))
rule = np.where(first[dec], r_first, r_face)
def score(pred, m):
    right = per(w * (pred == kind) * m); sev = per(w * (np.abs(pred - kind) == 2) * m); return right, sev
def learnt_rows(m_dec):
    """The rows alone, learnt on other spots: each row called by its commonest kind in the situation."""
    pred = np.zeros(len(w), dtype=int); hm = m_dec[dec]
    for fo_ in range(5):
        tr = hm & (dfold[dec] != fo_); te = hm & (dfold[dec] == fo_)
        for r in range(8):
            a = tr & (row == r)
            if a.any(): pred[te & (row == r)] = int(np.argmax(np.bincount(kind[a], weights=w[a], minlength=3)))
    return pred
say('| situation | decisions | mixing | rows alone (learnt) | the rulebook | severe | error per decision: median | P90 | P95 |'); say('|---|---|---|---|---|---|---|---|---|')
RULEBOOK = {}
for s, q, fi in SITS:
    m = sit_mask(s, q, fi); idx = np.where(m)[0]; hm = m[dec]
    r1, _ = score(learnt_rows(m), hm); r2, sv = score(rule, hm); err = (1 - r2[idx]) * 100; RULEBOOK[(s, q, fi)] = r2[idx].mean()
    say(f'| {sit_name(s, q, fi)} | {m.sum()} | {100 * mixing[m].mean():.0f}% | {100 * r1[idx].mean():.0f}% | {100 * r2[idx].mean():.0f}% | {100 * sv[idx].mean():.0f}% | {np.percentile(err, 50):.0f} | {np.percentile(err, 90):.0f} | {np.percentile(err, 95):.0f} |')

# ================================================================ 3. the chart, then one heuristic at a time
say('\n## 3. The chart, then the heuristic that helps most, then the next\n')
say('A strong learner, on spots it has not seen (three folds by spot). "Right" is the share of the range called right as Always / Mix / Never; "severe" is a hand that always acts called never, or the reverse.\n')
RU = np.random.default_rng(11).random(len(w)); CAP = 25000 if QUICK else 45000        # hands a situation is learnt from, at most
HAND = dict(row=row, equity=e, place_in_row=frac, place_in_range=grank, row_share=MR[dec, row],
            value_line=(e >= LINE).astype(float), air=(e < 0.2).astype(float), bet_share_of_its_kind=np.where(e >= LINE, qv[dec], np.where(e < 0.2, qb[dec], 0)),
            flush_outs=fo, straight_outs=so, draw_equity=draw, ahead_now=now, pocket=pocket.astype(float),
            margin_over_price=margin, inside_min_defence=(grank >= (1 - mdf)[dec]).astype(float), inside_defence_by_equity=(grank >= (1 - mdf2e)[dec]).astype(float), rulebook=rule.astype(float))
SPOTF = dict(who_led=role, pot_type=pot_type, stack_to_pot=spr, paired=paired, suits=suits, high_card=high, bet_size=main_size, small_size=small, bet_faced=betf, price=price,
             range_equity=my_eq, nut_advantage=nut_adv, my_strong=my_strong, his_strong=his_strong, his_weak=his_weak, my_weak=my_weak, my_ends=polar_me, his_ends=polar_him, his_middle=his_mid,
             top_pair_plus_lead=ra_rows, two_pair_plus_lead=na_rows, book_share=book, his_book_share=bookh, lead=lead, bet_share_by_rule=f_book, world=world, min_defence=mdf, defence_by_equity=mdf2e)
COL = {**HAND, **{k: v[dec] for k, v in SPOTF.items()}}
CHART = ['row', 'equity', 'place_in_row', 'place_in_range', 'row_share']
GROUPS_FIRST = {
    'who led the street before (seen)': ['who_led'], 'pot type (seen)': ['pot_type'], 'stack to pot (counted)': ['stack_to_pot'], 'board: paired, suits, high card (seen)': ['paired', 'suits', 'high_card'],
    'the bet sizes on offer (seen)': ['bet_size', 'small_size'], 'range equity advantage (read)': ['range_equity'], 'nut advantage and strong hands of both (read)': ['nut_advantage', 'my_strong', 'his_strong'],
    'weak hands of both (read)': ['his_weak', 'my_weak'], 'how polar each range is (read)': ['my_ends', 'his_ends', 'his_middle'], 'top pair+ and two pair+ lead, off the butterfly (read)': ['top_pair_plus_lead', 'two_pair_plus_lead'],
    'the book share and the lead over his (calculated)': ['book_share', 'his_book_share', 'lead', 'bet_share_by_rule'], 'the world reading (calculated)': ['world'],
    'the value line and the bluffs it allows, for the hand (calculated)': ['value_line', 'air', 'bet_share_of_its_kind'], 'the hand\'s draw (seen)': ['flush_outs', 'straight_outs', 'draw_equity', 'ahead_now'], 'the whole rulebook\'s call for the hand': ['rulebook']}
GROUPS_FACE = {
    'the price, and the hand\'s equity over it (calculated)': ['price', 'margin_over_price'], 'the bet faced (seen)': ['bet_faced'], 'minimum defence, and whether the hand is inside it (calculated)': ['min_defence', 'inside_min_defence'],
    'defence by range equity, and whether the hand is inside it (calculated)': ['defence_by_equity', 'inside_defence_by_equity'], 'who led the street before (seen)': ['who_led'], 'pot type (seen)': ['pot_type'], 'stack to pot (counted)': ['stack_to_pot'],
    'board: paired, suits, high card (seen)': ['paired', 'suits', 'high_card'], 'range equity advantage (read)': ['range_equity'], 'nut advantage and strong hands of both (read)': ['nut_advantage', 'my_strong', 'his_strong'],
    'weak hands of both (read)': ['his_weak', 'my_weak'], 'how polar each range is (read)': ['my_ends', 'his_ends', 'his_middle'], 'the hand\'s draw (seen)': ['flush_outs', 'straight_outs', 'draw_equity', 'ahead_now'], 'the whole rulebook\'s call for the hand': ['rulebook']}
CATS = {'row', 'who_led', 'pot_type'}
def fit_score(cols, hm, folds=3, full=False):
    idx = np.where(hm & (RU < CAP / max(hm.sum(), 1)))[0]; X = np.column_stack([COL[c][idx] for c in cols]).astype(np.float32); y = kind[idx]; ww = w[idx]; gsp = spots[dec[idx]]; pred = np.zeros(len(idx), dtype=int)
    cat = [i for i, c in enumerate(cols) if c in CATS]
    for tr, te in GroupKFold(n_splits=folds).split(X, y, gsp):
        mdl = HistGradientBoostingClassifier(max_iter=60 if QUICK else 80, learning_rate=0.15, max_leaf_nodes=31, categorical_features=cat or None).fit(X[tr], y[tr], sample_weight=ww[tr]); pred[te] = mdl.predict(X[te])
    dd = dec[idx]; tot = np.bincount(dd, weights=ww, minlength=N); right = np.bincount(dd, weights=ww * (pred == y), minlength=N); sev = np.bincount(dd, weights=ww * (np.abs(pred - y) == 2), minlength=N)
    ok = tot > 0; acc_d = right[ok] / tot[ok]
    return (acc_d.mean(), (sev[ok] / tot[ok]).mean(), acc_d) if full else acc_d.mean()
SUMMARY = []
for s, q, fi in SITS:
    t0 = time.time(); m = sit_mask(s, q, fi); hm = m[dec]; groups = GROUPS_FIRST if fi else GROUPS_FACE
    say(f'\n### {sit_name(s, q, fi)} ({m.sum()} decisions)\n')
    spot_cols = [c for cs in groups.values() for c in cs if c in SPOTF]
    a_spot = fit_score(spot_cols, hm); a_row = fit_score(spot_cols + ['row', 'row_share', 'flush_outs', 'straight_outs', 'pocket'], hm)
    a_chart, sev_chart, d_chart = fit_score(CHART, hm, full=True)
    chosen = list(CHART); left = dict(groups); steps = []; cur = a_chart
    for step in range(3 if QUICK else 6):
        best = None; tried = []
        for name, cs in left.items():
            a = fit_score(chosen + cs, hm); tried.append((a, name))
            if best is None or a > best[1]: best = (name, a)
        if step == 0: keep = {n for _, n in sorted(tried, reverse=True)[:7]}; left = {n: c for n, c in left.items() if n in keep}   # after the first round only the seven that helped most stay in the running
        if best is None or best[1] - cur < 0.004: break
        steps.append((best[0], best[1], best[1] - cur)); chosen += left.pop(best[0]); cur = best[1]
    a_fin, sev_fin, d_fin = fit_score(chosen, hm, full=True); a_all, sev_all, d_all = fit_score(CHART + [c for cs in groups.values() for c in cs], hm, full=True)
    say('| what the learner is given | right | gain | severe |'); say('|---|---|---|---|')
    say(f'| the spot\'s heuristics alone, nothing about the hand | {100 * a_spot:.0f}% | | |'); say(f'| the spot\'s heuristics and the hand\'s made class and draw, no chart | {100 * a_row:.0f}% | | |')
    say(f'| **the chart alone** (row, equity, place on the bar) | {100 * a_chart:.0f}% | | {100 * sev_chart:.0f}% |')
    for k, (name, a, gain) in enumerate(steps, 1): say(f'| + {k}. {name} | {100 * a:.0f}% | +{100 * gain:.1f} | |')
    say(f'| the chart and those {len(steps)} | {100 * a_fin:.0f}% | | {100 * sev_fin:.0f}% |'); say(f'| the chart and every heuristic | {100 * a_all:.0f}% | | {100 * sev_all:.0f}% |')
    say(f'| the rulebook, nothing fitted | {100 * RULEBOOK[(s, q, fi)]:.0f}% | | |')
    pc = lambda dd, p: f'{np.percentile((1 - dd) * 100, p):.0f}'
    say(f'\nError per decision, median / P90 / P95: chart alone {pc(d_chart, 50)} / {pc(d_chart, 90)} / {pc(d_chart, 95)}; chart and those {len(steps)}: {pc(d_fin, 50)} / {pc(d_fin, 90)} / {pc(d_fin, 95)}; everything: {pc(d_all, 50)} / {pc(d_all, 90)} / {pc(d_all, 95)}.')
    SUMMARY.append((sit_name(s, q, fi), m.sum(), a_spot, a_row, a_chart, a_fin, len(steps), a_all, sev_chart, sev_fin, sev_all, [x[0] for x in steps], np.percentile((1 - d_fin) * 100, 90)))
    print(f'  ({time.time() - t0:.0f} s)', file=sys.stderr)
say('\n## Summary\n'); say('| situation | spot alone | + made class | chart alone | chart + few | how many | chart + all | severe: chart | chart + few | P90 error, chart + few |'); say('|---|---|---|---|---|---|---|---|---|---|')
for nm, n, a_spot, a_row, a_chart, a_fin, k, a_all, s1, s2, s3, names, p90 in SUMMARY:
    say(f'| {nm} | {100 * a_spot:.0f}% | {100 * a_row:.0f}% | {100 * a_chart:.0f}% | {100 * a_fin:.0f}% | {k} | {100 * a_all:.0f}% | {100 * s1:.0f}% | {100 * s2:.0f}% | {p90:.0f} |')
say('\nThe heuristics chosen, in order:\n')
for nm, n, a_spot, a_row, a_chart, a_fin, k, a_all, s1, s2, s3, names, p90 in SUMMARY: say(f'- **{nm}**: ' + ('; '.join(names) if names else 'none added half a point'))
out.close()
