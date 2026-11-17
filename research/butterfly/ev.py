# What a call of Always / Mix / Never costs, and which kind of error it is.
# On the decisions solved again with each action's worth (collect.mjs VALUES=1, then FILES=hands-7v,hands-8v,hands-9v
# CACHE=cache-v python3 cache.py), every way of calling the range from heuristics.py is scored twice over:
#   - EV lost: playing the call (Always = act, Never = check or fold, Mix = half each) against each hand's best action,
#     summed over the range, in percent of the pot at the decision. Mean, P90 and P95 over decisions.
#   - the kind of each wrong call, by how the solver really plays the hand, with how much of the range it is and what it costs.
#   CACHE=cache-v python3 research/butterfly/ev.py   ->  research/butterfly/ev.md
import os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); os.environ.setdefault('CACHE', 'cache-v'); os.environ['OUT'] = os.devnull
exec(open(os.path.join(HERE, 'heuristics.py')).read().split('SUMMARY = []')[0])          # the readings, the rulebook, the heuristic groups
la, lp = Z['la'].astype(np.float64), Z['lp'].astype(np.float64)
PRELIM = os.environ.get('PRELIM')                                                          # a first look: only the calls that need no learner
out = open(PRELIM or os.path.join(HERE, 'ev.md'), 'w')
loss_of = lambda pred: np.where(pred == 2, la, np.where(pred == 0, lp, (la + lp) / 2))
TYPES = ['right', 'near the line', 'pure, on the majority side of a mix', 'pure, on the minority side of a mix', 'mixed where the solver is pure', 'the opposite']
def type_of(pred):
    """Each call by how the solver plays the hand: f is how often it acts."""
    g = np.where(pred == 2, f, 1 - f)                                                     # how often the solver does what a pure call says
    pure = np.select([g >= 0.9, g >= 0.8, g >= 0.5, g > 0.1], [0, 1, 2, 3], 5)
    side = np.maximum(f, 1 - f); mixed = np.select([side < 0.9, side < 0.97], [0, 1], 4)
    return np.where(pred == 1, mixed, pure)
def learn(cols, hm):
    """A call for every hand of the situation, learnt on other spots (five folds by spot)."""
    idx = np.where(hm)[0]; X = np.column_stack([COL[c][idx] for c in cols]).astype(np.float32); y = kind[idx]; pred = np.zeros(len(w), dtype=int); cat = [i for i, c in enumerate(cols) if c in CATS]; fo_h = dfold[dec[idx]]
    for k in range(5):
        tr = np.where(fo_h != k)[0]; te = fo_h == k
        if not te.any() or len(tr) < 50: continue
        if len(tr) > CAP: tr = np.random.default_rng(k).choice(tr, CAP, replace=False)
        pred[idx[te]] = HistGradientBoostingClassifier(max_iter=80, learning_rate=0.15, max_leaf_nodes=31, categorical_features=cat or None).fit(X[tr], y[tr], sample_weight=w[idx][tr]).predict(X[te])
    return pred
# the few heuristics the first study chose for each situation
FEW = {}; at = None
for line in open(os.path.join(HERE, 'heuristics.md')):
    if line.startswith('### '): at = line[4:].split(' (')[0]; FEW[at] = []
    mt = re.match(r'\| \+ \d+\. (.+?) \|', line)
    if mt and at: FEW[at].append(mt.group(1))
say(f'# What the calls cost, and the kinds of error ({N} decisions solved again with each action\'s worth, {len(uniq)} spots)\n')
say('EV lost is in percent of the pot at the decision, summed over the range: Always plays the acting move, Never checks or folds, Mix plays half of each. "The solver\'s own labels" is the floor of the measure: the right label for every hand, with every mix played half and half.\n')
ROWS = []; KINDS = []
for s, q, fi in SITS:
    m = sit_mask(s, q, fi); idx = np.where(m)[0]; hm = m[dec]; groups = GROUPS_FIRST if fi else GROUPS_FACE; nm = sit_name(s, q, fi)
    if m.sum() < 20: continue
    fewn = FEW.get(nm) or FEW.get(sit_name(s, 1 - q, fi), [])                             # a situation the first study did not finish takes the other seat's
    few = [c for g_ in fewn for c in groups[g_]]; every = [c for cs in groups.values() for c in cs]; spot_cols = [c for c in every if c in SPOTF]
    ways = [] if PRELIM else [('the solver\'s own labels', kind), ('rows alone', learnt_rows(m)), ('the rulebook, nothing fitted', rule), ('heuristics and made class, no chart', learn(spot_cols + ['row', 'row_share', 'flush_outs', 'straight_outs', 'pocket'], hm)),
            ('the chart alone', learn(CHART, hm)), (f'the chart and its {len(fewn)} heuristics', learn(CHART + few, hm)), ('the chart and every heuristic', learn(CHART + every, hm))]
    if PRELIM: ways = [('the solver\'s own labels', kind), ('rows alone', learnt_rows(m)), ('the rulebook, nothing fitted', rule), ('always check or fold', np.zeros(len(w), dtype=int)), ('always act', np.full(len(w), 2))]
    say(f'\n## {nm} ({m.sum()} decisions)\n'); say('| the call | right | EV lost: mean | median | P90 | P95 | decisions losing over 1% pot |'); say('|---|---|---|---|---|---|---|')
    for name, pred in ways:
        L = per(w * loss_of(pred) * hm)[idx] * 100; right = per(w * (pred == kind) * hm)[idx]
        say(f'| {name} | {100 * right.mean():.0f}% | {L.mean():.2f} | {np.percentile(L, 50):.2f} | {np.percentile(L, 90):.2f} | {np.percentile(L, 95):.2f} | {100 * np.mean(L > 1):.0f}% |')
        ROWS.append((nm, name, right.mean(), L.mean(), np.percentile(L, 90), np.percentile(L, 95)))
    say('\nThe kinds of call, as a share of the range, and what each costs (percent of the pot, per decision):\n'); say('| the call | ' + ' | '.join(TYPES) + ' |'); say('|---|' + '---|' * len(TYPES))
    for name, pred in ways[1:]:
        t = type_of(pred); ls = loss_of(pred); cells = []
        for k in range(len(TYPES)):
            a = hm & (t == k); cells.append(f'{100 * per(w * a)[idx].mean():.0f}% / {100 * per(w * ls * a)[idx].mean():.2f}')
        say(f'| {name} | ' + ' | '.join(cells) + ' |'); KINDS.append((nm, name, cells))
say('\n## Summary: EV lost, mean (P90), percent of the pot\n'); names = [r[1] if 'heuristics' not in r[1] or 'no chart' in r[1] or 'every' in r[1] else 'the chart and its few' for r in ROWS]
order = []
for r, n_ in zip(ROWS, names):
    if n_ not in order: order.append(n_)
say('| situation | ' + ' | '.join(order) + ' |'); say('|---|' + '---|' * len(order)); cur = {}
for r, n_ in zip(ROWS, names): cur.setdefault(r[0], {})[n_] = f'{r[3]:.2f} ({r[4]:.2f})'
for nm, cells in cur.items(): say(f'| {nm} | ' + ' | '.join(cells[o] for o in order) + ' |')
out.close()
