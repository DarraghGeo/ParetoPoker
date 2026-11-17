# Does the butterfly predict Always / Mix / Never? Checked against the solved decisions already stored in
# research/insight/out (hands-7/8/9 and full-1..6: about 10,000 decisions on 100-odd spots, every hand with its equity,
# its strategy and what he does against each bet, and his range).
#
# At each decision every hand of the range to act goes in its butterfly row (by made hand, as web/lib/study/butterfly.js)
# and is always (90%+), never (10%-) or mix. First to act the action is betting; facing a bet it is continuing.
# Four things are measured, each as the share of the range called right:
#   none     the whole row called by its commonest kind (the rows alone, no line)
#   ceiling  the best two cuts along the row for that very decision, the kinds running never | mix | always one way or
#            the other: by equity, and (first to act) by the row's special line (ahead now / still to come / he folds)
#   free     the best two or three cuts with any kinds between them (what a shape other than never|mix|always would add)
#   learnt   cuts learnt on other spots and applied to this one (five folds, split by spot): where along the bar the
#            cuts fall (a share of the bar), or at which equity; with and without knowing who has the range advantage.
#            This is the honest one: what a player who has learnt where the cuts go would get on a spot not seen.
# All of it by street, seat, pot, range advantage (share of top pair or better against his), nut advantage (two pair or
# better) and row, with the spread over decisions: median, P90, P95 and the worst of the error.
#   python3 research/butterfly/analyse.py            (about two minutes)
import json, sys, os, collections
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)); DATA = os.path.join(HERE, '..', 'insight', 'out')
FILES = ['hands-7', 'hands-8', 'hands-9', 'full-1', 'full-2', 'full-3', 'full-4', 'full-5', 'full-6']
RANKS = '23456789TJQKA'; ROWS = ['Air', 'DR', 'LP', 'MP', 'TP', 'OP', '2P', 'TR+']
LINES = ['folds', 'come', 'folds', 'come', 'now', 'now', 'now', 'now']
ABS, FRAC = 50, 40          # bins of equity (2 points each) and of place along the bar
WAGER = ('bet', 'raise', 'allin')

def cards(text): t = text.replace(' ', ''); return [(RANKS.index(t[i]), t[i + 1]) for i in range(0, len(t), 2)]
def straight_top(ranks):
    have = set(ranks)
    if 12 in have: have.add(-1)
    for top in range(12, 2, -1):
        if all(top - k in have for k in range(5)): return top
    return -1
def row_of(hole, board):
    on = [c[0] for c in board]; tops = sorted(set(on), reverse=True); allc = hole + board
    for s in 'shdc':
        if any(c[1] == s for c in hole) and sum(c[1] == s for c in board) < 5 and sum(c[1] == s for c in allc) >= 5: return 7
    if straight_top([c[0] for c in allc]) > straight_top(on): return 7
    if any(on.count(c[0]) + sum(x[0] == c[0] for x in hole) >= 3 for c in hole): return 7
    pocket = hole[0][0] == hole[1][0]; hit = [c for c in hole if c[0] in on]
    if not pocket and len(hit) == 2: return 6
    if pocket: return 5 if hole[0][0] > tops[0] else 3 if hole[0][0] >= (tops[1] if len(tops) > 1 else -1) else 2
    if hit: return 4 if hit[0][0] == tops[0] else 3 if len(tops) > 1 and hit[0][0] == tops[1] else 2
    if len(board) < 5:
        for s in 'shdc':
            if any(c[1] == s for c in hole) and sum(c[1] == s for c in board) < 5 and sum(c[1] == s for c in allc) == 4: return 1
        ranks = [c[0] for c in allc]; now = straight_top(ranks)
        if sum(1 for r in range(13) if r not in ranks and straight_top(ranks + [r]) > now) >= 2: return 1
    return 0

def mono(kind, w):
    """Best two cuts along an order, kinds running never|mix|always or always|mix|never: (weight right, severe weight)."""
    n = len(w); z = np.zeros(1)
    A = np.concatenate([z, np.cumsum(w * (kind == 0))]); B = np.concatenate([z, np.cumsum(w * (kind == 1))]); C = np.concatenate([z, np.cumsum(w * (kind == 2))])
    best = (-1, 0)
    for lo, hi in ((A, C), (C, A)):          # the kind at the low end of the order, and at the high end
        run = np.maximum.accumulate(lo - B); tot = (B - hi) + run + hi[n]; j = int(np.argmax(tot)); i = int(np.argmax((lo - B)[:j + 1]))
        severe = hi[i] + (lo[n] - lo[j])     # the high end's kind called the low end's, and the other way round
        if tot[j] > best[0]: best = (float(tot[j]), float(severe))
    return best

def free_dp(H, K):
    """Best K stretches along binned bars with any kind in each: H[rows, bins, 3] -> weight right per row."""
    R = H.shape[0]; dp = np.full((K, 3, R), -1e9); dp[0] = 0
    for b in range(H.shape[1]):
        new = np.empty_like(dp); prev_best = np.full(R, -1e9)
        for k in range(K):
            for c in range(3): new[k, c] = np.maximum(dp[k, c], prev_best) + H[:, b, c]
            prev_best = np.maximum(prev_best, dp[k].max(axis=0))
        dp = new
    return dp.max(axis=(0, 1))

def mono_bins(H):
    """Best never|mix|always cuts over bins, either way: (weight right, cut i, cut j, order) for one histogram [bins, 3]."""
    n = H.shape[0]; z = np.zeros(1); cs = [np.concatenate([z, np.cumsum(H[:, c])]) for c in range(3)]; best = (-1, 0, 0, 0)
    for o, (lo, hi) in enumerate(((cs[0], cs[2]), (cs[2], cs[0]))):
        B = cs[1]; run = np.maximum.accumulate(lo - B); tot = (B - hi) + run + hi[n]; j = int(np.argmax(tot)); i = int(np.argmax((lo - B)[:j + 1]))
        if tot[j] > best[0]: best = (float(tot[j]), i, j, o)
    return best
def predict(cut, bins):
    _, i, j, o = cut; out = np.full(bins, 1); out[:i] = 0 if o == 0 else 2; out[j:] = 2 if o == 0 else 0; return out

# ---------------------------------------------------------------- read
D = []                      # one record a decision
HA = []; HF = []            # per decision: [8 rows, bins, 3 kinds] by equity bin, and by place along the bar
for name in FILES:
    path = os.path.join(DATA, name + '.jsonl')
    if not os.path.exists(path): continue
    for text in open(path):
        d = json.loads(text); vr = d.get('vr')
        if not vr or not d['hands']: continue
        board = cards(d['board']); acts = d['actions']; first = d['toCall'] <= 0; kinds = [a['kind'] for a in acts]
        wag = [i for i, k in enumerate(kinds) if k in WAGER]; fold = kinds.index('fold') if 'fold' in kinds else -1
        if first and not wag: continue
        if not first and fold < 0: continue
        main = max(wag, key=lambda i: acts[i]['freq']) if wag else -1
        hs = d['hands']; n = len(hs)
        w = np.array([h['w'] for h in hs]); e = np.array([h['e'] if h['e'] is not None else np.nan for h in hs]); ok = ~np.isnan(e) & (w > 0)
        if ok.sum() < 8: continue
        P = np.array([h['p'] for h in hs]); f = P[:, wag].sum(axis=1) if first else 1 - P[:, fold]
        kind = np.where(f >= 0.9, 2, np.where(f <= 0.1, 0, 1))
        row = np.array([row_of(cards(h['h']), board) for h in hs])
        now = np.array([h['now'] if h.get('now') is not None else h['e'] or 0 for h in hs]); draw = np.array([h.get('draw') or 0 for h in hs])
        folds = np.array([(h['re'][main][0] if (main >= 0 and h.get('re') and h['re'][main]) else np.nan) for h in hs]) if first else np.full(n, np.nan)
        river = len(board) == 5
        vw = np.array([x[1] for x in vr]); vrow = np.array([row_of(cards(x[0]), board) for x in vr])
        mine = np.array([w[ok & (row == r)].sum() for r in range(8)]); his = np.array([vw[vrow == r].sum() for r in range(8)])
        ms, hsr = mine / max(mine.sum(), 1e-9), his / max(his.sum(), 1e-9)
        rec = dict(spot=d['spot'], pot=d['action'], line=d['line'], street=len(board) - 3, seat=d['seat'], first=first, board=d['board'],
                   ra=float(ms[4:].sum() - hsr[4:].sum()), na=float(ms[6:].sum() - hsr[6:].sum()), W=float(w[ok].sum()),
                   mix=float(w[ok & (kind == 1)].sum() / w[ok].sum()), act=float((w[ok] * f[ok]).sum() / w[ok].sum()), rows={})
        ha = np.zeros((8, ABS, 3), np.float32); hf = np.zeros((8, FRAC, 3), np.float32)
        for r in range(8):
            m = ok & (row == r)
            if not m.any(): continue
            ww, kk, ee = w[m], kind[m], e[m]; Wr = float(ww.sum()); o = np.argsort(ee, kind='stable'); ws, ks = ww[o], kk[o]
            eq, sev = mono(ks, ws); kw = [float(ww[kk == c].sum()) for c in range(3)]
            R = dict(W=Wr, none=max(kw), eq=eq, sev=sev, kinds=kw)
            if first:
                which = LINES[r]; meas = folds[m] if (which == 'folds' and not np.isnan(folds[m]).any()) else draw[m] if (which == 'come' and not river) else now[m]
                o2 = np.argsort(meas, kind='stable'); R['line'] = mono(kk[o2], ww[o2])[0]
            rec['rows'][r] = R
            np.add.at(ha[r], (np.clip((ee[o] * ABS).astype(int), 0, ABS - 1), ks), ws)
            mid = (np.cumsum(ws) - ws / 2) / Wr; np.add.at(hf[r], (np.clip((mid * FRAC).astype(int), 0, FRAC - 1), ks), ws)
        D.append(rec); HA.append(ha); HF.append(hf)
    print(f'read {name}: {len(D)} decisions so far', file=sys.stderr)
HA = np.stack(HA); HF = np.stack(HF); N = len(D)

# ---------------------------------------------------------------- free shapes (on the binned bars)
flat = HF.reshape(N * 8, FRAC, 3).astype(np.float64); f3 = free_dp(flat, 3).reshape(N, 8); f4 = free_dp(flat, 4).reshape(N, 8)
for i, rec in enumerate(D):
    for r, R in rec['rows'].items(): R['free3'] = float(max(f3[i, r], R['eq'])); R['free4'] = float(max(f4[i, r], R['free3']))

# ---------------------------------------------------------------- cuts learnt on other spots
ra_bin = lambda x: 0 if x <= -0.03 else 2 if x >= 0.03 else 1
na_bin = lambda x: 0 if x <= -0.02 else 2 if x >= 0.02 else 1
spots = sorted({rec['spot'] for rec in D}); rng = np.random.default_rng(3); order = rng.permutation(len(spots)); fold_of = {spots[s]: k % 5 for k, s in enumerate(order)}
folds_ = np.array([fold_of[rec['spot']] for rec in D])
base = lambda rec: (rec['street'], rec['first'], rec['seat'])
KEYS = dict(frac=(HF, base), eqcut=(HA, base), frac_ra=(HF, lambda rec: base(rec) + (ra_bin(rec['ra']),)), eqcut_ra=(HA, lambda rec: base(rec) + (ra_bin(rec['ra']),)),
            frac_pot=(HF, lambda rec: base(rec) + (rec['pot'],)), frac_ra_na=(HF, lambda rec: base(rec) + (ra_bin(rec['ra']), na_bin(rec['na']))))
for name, (H, key) in KEYS.items():
    keys = [key(rec) for rec in D]; groups = collections.defaultdict(list)
    for i, k in enumerate(keys): groups[k].append(i)
    for k, idx in groups.items():
        idx = np.array(idx)
        for fo in range(5):
            test = idx[folds_[idx] == fo]; train = idx[folds_[idx] != fo]
            if not len(test): continue
            for r in range(8):
                pool = H[train, r].sum(axis=0).astype(np.float64) if len(train) else np.zeros(H.shape[2:])
                if pool.sum() <= 0: pool = H[idx, r].sum(axis=0).astype(np.float64)
                pred = predict(mono_bins(pool), H.shape[2]); right = H[test, r][:, np.arange(H.shape[2]), pred].sum(axis=1)
                for i, x in zip(test, right):
                    if r in D[i]['rows']: D[i]['rows'][r][name] = float(x)
# the rows alone, learnt the same way: each row called by its commonest kind on the other spots
keys = [base(rec) for rec in D]; groups = collections.defaultdict(list)
for i, k in enumerate(keys): groups[k].append(i)
for k, idx in groups.items():
    idx = np.array(idx)
    for fo in range(5):
        test = idx[folds_[idx] == fo]; train = idx[folds_[idx] != fo]
        for r in range(8):
            pool = HF[train if len(train) else idx, r].sum(axis=(0, 1)); c = int(np.argmax(pool))
            for i in test:
                if r in D[i]['rows']: D[i]['rows'][r]['rows_learnt'] = D[i]['rows'][r]['kinds'][c]

# ---------------------------------------------------------------- report
MEAS = ['none', 'rows_learnt', 'frac', 'eqcut', 'frac_ra', 'frac_ra_na', 'frac_pot', 'eq', 'free3', 'free4']
def acc(rec, m, rows=None):
    num = den = 0.0
    for r, R in rec['rows'].items():
        if rows is not None and r not in rows: continue
        if m not in R: return None
        num += R[m]; den += R['W']
    return num / den if den > 0 else None
def table(title, groups, meas=('none', 'rows_learnt', 'frac', 'frac_ra', 'eqcut', 'eq', 'free3'), out=sys.stdout):
    print(f'\n### {title}\n', file=out)
    print('| | decisions | mixing | ' + ' | '.join(LABEL[m] for m in meas) + ' | learnt error: median | P90 | P95 | worst |', file=out)
    print('|---|---|---|' + '---|' * (len(meas) + 4), file=out)
    for name, recs in groups:
        if len(recs) < 8: continue
        cells = []
        for m in meas:
            v = [a for a in (acc(r, m) for r in recs) if a is not None]; cells.append(f'{100 * np.mean(v):.0f}%' if v else '-')
        err = np.array([1 - acc(r, 'frac') for r in recs]) * 100
        print(f'| {name} | {len(recs)} | {100 * np.mean([r["mix"] for r in recs]):.0f}% | ' + ' | '.join(cells) + f' | {np.percentile(err, 50):.0f} | {np.percentile(err, 90):.0f} | {np.percentile(err, 95):.0f} | {err.max():.0f} |', file=out)
LABEL = dict(none='rows only (this spot)', rows_learnt='rows only (learnt)', frac='cuts learnt: place on bar', eqcut='cuts learnt: equity value', frac_ra='place on bar + range adv.',
             frac_ra_na='+ nut adv.', frac_pot='place on bar + pot type', eq='ceiling: equity', free3='ceiling: any 3 stretches', free4='ceiling: any 4 stretches', line='ceiling: special lines')
STREET = ['flop', 'turn', 'river']; SEAT = ['out of position', 'in position']; RA = ['behind (3+ points)', 'level', 'ahead (3+ points)']; NA = ['behind (2+ points)', 'level', 'ahead (2+ points)']
def by(recs, key, names): return [(names[k] if not isinstance(names, dict) else names[k], [r for r in recs if key(r) == k]) for k in (range(len(names)) if not isinstance(names, dict) else names)]

out = open(os.path.join(HERE, 'report.md'), 'w')
def both(*a, **k): print(*a, **k); print(*a, **k, file=out)
both(f'# The butterfly against {N} stored solved decisions ({len(spots)} spots)\n')
both('Share of the range called right as Always / Mix / Never. "Learnt" columns are cuts learnt on other spots (five folds by spot). Error columns are for "cuts learnt: place on bar", over decisions.')
for sit, title in ((True, 'First to act: bet or check'), (False, 'Facing a bet: continue or fold')):
    recs = [r for r in D if r['first'] == sit]
    for o in (sys.stdout, out):
        print(f'\n## {title}', file=o)
        table('Overall', [('all', recs)], out=o)
        table('By street', by(recs, lambda r: r['street'], STREET), out=o)
        table('By seat', by(recs, lambda r: r['seat'], SEAT), out=o)
        table('By street and seat', [(f'{STREET[s]}, {SEAT[q]}', [r for r in recs if r['street'] == s and r['seat'] == q]) for s in range(3) for q in range(2)], out=o)
        table('By range advantage (share of top pair or better, against his)', by(recs, lambda r: ra_bin(r['ra']), RA), out=o)
        table('By nut advantage (share of two pair or better, against his)', by(recs, lambda r: na_bin(r['na']), NA), out=o)
        table('By range advantage and seat', [(f'{RA[a]}, {SEAT[q]}', [r for r in recs if ra_bin(r['ra']) == a and r['seat'] == q]) for a in range(3) for q in range(2)], out=o)
        table('By pot', by(recs, lambda r: r['pot'], {p: p for p in ['SRP', '3BP', '4BP', 'Squeeze']}), out=o)
        table('By how much of the range mixes', [(n, [r for r in recs if lo <= r['mix'] < hi]) for n, lo, hi in (('under 15%', 0, .15), ('15 to 30%', .15, .3), ('30 to 50%', .3, .5), ('over 50%', .5, 2))], out=o)
        table('What knowing more adds (all learnt)', [('all', recs)] + by(recs, lambda r: r['street'], STREET), meas=('rows_learnt', 'frac', 'frac_ra', 'frac_ra_na', 'frac_pot', 'eqcut'), out=o)
        # rows
        print('\n### By row\n', file=o)
        cols = ['none', 'frac', 'frac_ra', 'eq'] + (['line'] if sit else [])
        print('| row | share of range | never / mix / always | ' + ' | '.join(LABEL[m] for m in cols) + ' | severe (always called never, or the reverse), at the ceiling |', file=o); print('|---|---|---|' + '---|' * (len(cols) + 1), file=o)
        tot = sum(R['W'] / r['W'] for r in recs for R in r['rows'].values())
        for q in range(7, -1, -1):
            rr = [(r, r['rows'][q]) for r in recs if q in r['rows']]
            if not rr: continue
            sh = sum(R['W'] / r['W'] for r, R in rr) / len(recs); k = np.array([np.array(R['kinds']) / r['W'] for r, R in rr]).sum(axis=0); k = k / k.sum()
            cells = [f"{100 * sum(R[m] / r['W'] for r, R in rr if m in R) / sum(R['W'] / r['W'] for r, R in rr if m in R):.0f}%" for m in cols]
            sev = sum(R['sev'] / r['W'] for r, R in rr) / sum(R['W'] / r['W'] for r, R in rr)
            print(f"| {ROWS[q]} | {100 * sh:.0f}% | {100 * k[0]:.0f} / {100 * k[1]:.0f} / {100 * k[2]:.0f} | " + ' | '.join(cells) + f' | {100 * sev:.1f}% |', file=o)
        for label, key, names in (('range advantage', lambda r: ra_bin(r['ra']), RA), ('street', lambda r: r['street'], STREET), ('seat', lambda r: r['seat'], SEAT), ('nut advantage', lambda r: na_bin(r['na']), NA)):
            print(f'\n### Each row by {label} (cuts learnt: place on bar; ceiling by equity in brackets)\n', file=o)
            print('| row | ' + ' | '.join(names) + ' |', file=o); print('|---|' + '---|' * len(names), file=o)
            for q in range(7, -1, -1):
                cells = []
                for kx in range(len(names)):
                    rr = [(r, r['rows'][q]) for r in recs if key(r) == kx and q in r['rows']]; den = sum(R['W'] / r['W'] for r, R in rr)
                    cells.append(f"{100 * sum(R['frac'] / r['W'] for r, R in rr) / den:.0f}% ({100 * sum(R['eq'] / r['W'] for r, R in rr) / den:.0f}%)" if den > 0.5 else '-')
                print(f'| {ROWS[q]} | ' + ' | '.join(cells) + ' |', file=o)
        # the tail
        err = np.array([1 - acc(r, 'frac') for r in recs]); cut = np.percentile(err, 90); worst = [r for r, x in zip(recs, err) if x >= cut]
        print(f'\n### The worst tenth (learnt error {100 * cut:.0f}% or more; {len(worst)} decisions)\n', file=o)
        print('| | all decisions | worst tenth |', file=o); print('|---|---|---|', file=o)
        def share(rs, test): return f'{100 * np.mean([test(r) for r in rs]):.0f}%'
        for label, test in [('flop', lambda r: r['street'] == 0), ('turn', lambda r: r['street'] == 1), ('river', lambda r: r['street'] == 2), ('out of position', lambda r: r['seat'] == 0),
                            ('range advantage: behind', lambda r: ra_bin(r['ra']) == 0), ('range advantage: ahead', lambda r: ra_bin(r['ra']) == 2), ('nut advantage: behind', lambda r: na_bin(r['na']) == 0), ('nut advantage: ahead', lambda r: na_bin(r['na']) == 2),
                            ('single-raised pot', lambda r: r['pot'] == 'SRP'), ('4-bet pot', lambda r: r['pot'] == '4BP')]:
            print(f'| {label} | {share(recs, test)} | {share(worst, test)} |', file=o)
        print(f'| mixing (mean) | {100 * np.mean([r["mix"] for r in recs]):.0f}% | {100 * np.mean([r["mix"] for r in worst]):.0f}% |', file=o)
        print(f'| how often the range acts (mean) | {100 * np.mean([r["act"] for r in recs]):.0f}% | {100 * np.mean([r["act"] for r in worst]):.0f}% |', file=o)
        print(f'| ceiling by equity (mean) | {100 * np.mean([acc(r, "eq") for r in recs]):.0f}% | {100 * np.mean([acc(r, "eq") for r in worst]):.0f}% |', file=o)
        print('\nThe ten worst:\n', file=o)
        for i in np.argsort(-err)[:10]:
            r = recs[i]; print(f"- {r['spot']} | line {r['line']} | {STREET[r['street']]}, {SEAT[r['seat']]} | learnt {100 * (1 - err[i]):.0f}% right, ceiling {100 * acc(r, 'eq'):.0f}%, rows alone {100 * acc(r, 'none'):.0f}% | mixing {100 * r['mix']:.0f}%, acts {100 * r['act']:.0f}% | range adv {100 * r['ra']:+.0f}, nut adv {100 * r['na']:+.0f}", file=o)
        if sit:
            print('\n### The special lines against plain equity (ceilings, first to act)\n', file=o)
            print('| | equity | special lines |', file=o); print('|---|---|---|', file=o)
            for nm, rs in [('all', recs)] + by(recs, lambda r: r['street'], STREET):
                print(f"| {nm} | {100 * np.mean([acc(r, 'eq') for r in rs]):.0f}% | {100 * np.mean([acc(r, 'line') for r in rs]):.0f}% |", file=o)
out.close()
json.dump([{k: v for k, v in r.items()} for r in D], open(os.path.join(HERE, 'decisions.json'), 'w'))
print(f'\nwrote {os.path.join(HERE, "report.md")}', file=sys.stderr)
