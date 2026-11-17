# Worked examples for the guide: for each situation two real decisions (not the best cases: the ones whose loss by the
# table is nearest the situation's median), with the two ranges by row, a few hands, what the table says and what the
# solver does.     python3 research/butterfly/guide_data.py   ->  research/butterfly/guide/data.json
import os, json
HERE = os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(HERE, 'rules.py')).read().split("out = open(os.path.join(HERE, 'rules.md')")[0])
BOOK = json.load(open(os.path.join(HERE, 'rules.json'))); DATA = os.path.join(HERE, '..', 'insight', 'out')
names_of = []                                              # each decision's hands by name, in the cache's order
for name in os.environ.get('FILES', 'hands-7v,hands-8v,hands-9v').split(','):
    for text in open(os.path.join(DATA, name + '.jsonl')):
        d = json.loads(text)
        if not d.get('vr') or not d['hands']: continue
        kinds = [a['kind'] for a in d['actions']]; fst = d['toCall'] <= 0; wag = [k for k in kinds if k in ('bet', 'raise', 'allin')]
        if (fst and not wag) or (not fst and 'fold' not in kinds): continue
        hs = [h['h'] for h in d['hands'] if h['e'] is not None and h['w'] > 0]
        if len(hs) < 8: continue
        names_of.append(hs)
assert len(names_of) == N and all(len(names_of[k]) == D[k]['n'] for k in range(N))
start = np.concatenate([[0], np.cumsum([d['n'] for d in D])])
DRAWS = HANDF['draw'][1]
MODEL = {}                                                 # the fitted model's loss (ev.md): the chart and its few heuristics, mean and P90
for line in open(os.path.join(HERE, 'ev.md')).read().split('## Summary')[1].splitlines():
    cells = [x.strip() for x in line.split('|')]
    if len(cells) > 7 and ',' in cells[1]: MODEL[cells[1]] = [float(cells[7].split(' (')[0]), float(cells[7].split('(')[1].rstrip(')'))]
res = {}
for s, q, fi in SITS:
    nm = sit_name(s, q, fi); b = BOOK[nm]; m = sit_mask(s, q, fi); idx = np.where(m[dec])[0]; c, size = codes(b['names'], idx)
    call = {tuple(x['key']): x for x in b['cells']}; labels = [b['labels'][n] for n in b['names']]
    def key_of(code):
        parts = []
        for lab in reversed(labels): parts.append(lab[code % len(lab)]); code //= len(lab)
        return tuple(parts[::-1])
    EMPTY = dict(call='no', lean='no', gap=0, solver=0, share=0); does = lambda x: (x['lean'] if x['call'] == 'either' else x['call']) == 'act'
    act_h = np.array([1 if does(call.get(key_of(x), EMPTY)) else 0 for x in range(size)])[c]; loss = np.where(act_h == 1, la[idx], lp[idx])
    L = np.bincount(dec[idx], weights=w[idx] * loss, minlength=N) * 100; ks = np.where(m)[0]; med = np.median(L[ks]); picked = []
    for k in ks[np.argsort(np.abs(L[ks] - med))]:
        d = D[k]
        if d['n'] < 60 or any(D[p]['pot_type'] == d['pot_type'] or D[p]['spot'] == d['spot'] for p in picked): continue
        sel = np.arange(start[k], start[k + 1]); hc, _ = codes(b['names'], sel)
        if len({key_of(x)[:len(b['hand'])] for x, ww in zip(hc, w[sel]) if ww >= 0.2 * w[sel].max()}) < 4: continue      # an example needs several kinds of hand
        picked.append(k)
        if len(picked) == 2: break
    exs = []
    for k in picked:
        d = D[k]; a, z = start[k], start[k + 1]; sel = np.arange(a, z); hc, _ = codes(b['names'], sel); rows = []
        for r in range(7, -1, -1):
            mr = sel[row[sel] == r]; ws = w[mr].sum()
            rows.append(dict(row=ROWS[r], mine=d['my_rows'][r], his=d['his_rows'][r], solver=float((w[mr] * f[mr]).sum() / ws) if ws > 0 else None))
        hands = []; seen = set()
        for j in np.argsort(-e[sel]):
            ky = key_of(hc[j]); hk = ky[:len(b['hand'])]
            if hk in seen or w[sel[j]] < 0.2 * w[sel].max(): continue
            seen.add(hk); i = sel[j]; cl = call[ky]
            hands.append(dict(hand=names_of[k][j], row=ROWS[row[i]], equity=float(e[i]), draw=DRAWS[int(HANDF['draw'][0][i])], margin=float(margin[i]), key=list(ky), call=cl['call'], lean=cl['lean'], solver=float(f[i]),
                              cost_act=float(100 * la[i]), cost_no=float(100 * lp[i])))
        spotread = {n: SPOTF[n][1][int(SPOTF[n][0][k])] for n in SPOTF}
        exs.append(dict(spot=d['spot'], pot_type=d['pot_type'], pre=d['pre'], board=d['board'], line=d['line'], pot=d['pot'], toCall=d['toCall'], behind=d['behind'], spr=d['spr'], price=d['price'], bet=d['bet'],
                        solver_acts=d['act'], my_eq=d['my_eq'], reads=spotread, values=dict(tp_lead=float(ra_rows[k]), polar=float(polar_me[k]), his_weak=float(his_weak[k])), rows=rows, hands=hands[:7], lost=float(L[k]), who=['nobody', 'I did', 'he did'][int(role[k])]))
    per_d = lambda x: 100 * np.bincount(dec[idx], weights=w[idx] * x, minlength=N)[ks]
    res[nm] = dict(table=b, examples=exs, n=int(m.sum()), solver_acts=float(act[m].mean()), always=float(per_d(la[idx]).mean()), never=float(per_d(lp[idx]).mean()), model=MODEL.get(nm))
os.makedirs(os.path.join(HERE, 'guide'), exist_ok=True); json.dump(res, open(os.path.join(HERE, 'guide', 'data.json'), 'w'), indent=1, default=float)
print('ok', {k: len(v['examples']) for k, v in res.items()})
