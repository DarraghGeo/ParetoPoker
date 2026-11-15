# Data for the chart mock-up: three real solved decisions, reduced to what the pictures draw.
import json, numpy as np
PICK = {'flop': ('../../insight/out/full-3.jsonl', 75), 'face': ('../../insight/out/hands-7.jsonl', 344), 'river': ('../../insight/out/hands-7.jsonl', 807)}
SHAPES = {'Top bets, rest a third': [34,33,31,27,21,20,22,38,66,74], 'Both ends': [82,53,19,9,8,21,59,86,92,91], 'Check everything': [10,6,5,4,4,5,8,12,13,13], 'Top half': [29,33,38,37,41,66,82,86,88,82], 'Bet everything': [74,72,66,62,71,77,80,86,92,91]}
SUIT = {'s': '♠', 'h': '♥', 'd': '♦', 'c': '♣'}
pretty = lambda h: h[0] + SUIT[h[1]] + h[2] + SUIT[h[3]]
def blocks(e, w, P, names, n=40):
    o = np.argsort(-e, kind='stable'); e, w, names = e[o], w[o], [names[i] for i in o]; P = P[o] if P is not None else None; c = np.cumsum(w) / w.sum(); b = np.minimum((c * n - 1e-9).astype(int), n - 1); out = []
    for i in range(n):
        m = b == i
        if not m.any(): out.append(out[-1]); continue
        ww = w[m]; out.append(dict(e=round(float((e[m] * ww).sum() / ww.sum()), 3), mix=[round(float(x), 3) for x in (P[m] * ww[:, None]).sum(0) / ww.sum()] if P is not None else None, ex=pretty(names[np.flatnonzero(m)[int(np.argmax(ww))]])))
    return out
def above(e, w, t): return round(float(w[e >= t].sum() / w.sum()), 3)
out = {}
for key, (f, i) in PICK.items():
    r = json.loads(open(f).read().split('\n')[i]); hs = [h for h in r['hands'] if h['w'] > 0 and h['e'] is not None]
    e = np.array([h['e'] for h in hs]); w = np.array([h['w'] for h in hs]); P = np.array([h['p'] for h in hs]); names = [h['h'] for h in hs]
    vr = [x for x in r['vr'] if x[2] is not None]; he = np.array([x[2] for x in vr]); hw = np.array([x[1] for x in vr])
    d = dict(spot=r['spot'].split()[0], board=r['board'], pot=r['pot'], toCall=r['toCall'], seat='OOP' if r['seat'] == 0 else 'IP', actions=[dict(label=a['label'], kind=a['kind'], freq=round(a['freq'], 3)) for a in r['actions']],
             mine=blocks(e, w, P, names), his=blocks(he, hw, None, [x[0] for x in vr]), top70=[above(e, w, .7), above(he, hw, .7)], top50=[above(e, w, .5), above(he, hw, .5)], eq=[round(float((e * w).sum() / w.sum()), 3), round(float((he * hw).sum() / hw.sum()), 3)])
    agg = np.array([0.0 if a['kind'] in ('check', 'fold') else 1.0 for a in r['actions']]); act = P @ agg
    o = np.argsort(e, kind='stable'); c = np.cumsum(w[o]) / w.sum(); b = np.minimum((c * 10 - 1e-9).astype(int), 9); prof = [float((w[o][b == k] * act[o][b == k]).sum() / max(w[o][b == k].sum(), 1e-9)) * 100 for k in range(10)]
    d['profile'] = [round(x) for x in prof]; d['shape'] = min(SHAPES, key=lambda s: sum((a - b) ** 2 for a, b in zip(SHAPES[s], prof)))
    if r['toCall'] > 0: d['price'] = round(r['toCall'] / (r['pot'] + r['toCall']), 3); d['priceRank'] = above(e, w, d['price']); d['cont'] = round(float((w * act).sum() / w.sum()), 3)
    if key == 'flop':
        sw = np.array([(h['up'] or 0) + (h['down'] or 0) for h in hs]); o2 = np.argsort(sw); med = sw[o2][np.searchsorted(np.cumsum(w[o2]) / w.sum(), 0.5)]; cells = []
        for row, (lo, hi) in enumerate(((.7, 2), (.4, .7), (-1, .4))):
            for col in (0, 1):
                m = (e >= lo) & (e < hi) & ((sw > med) if col else (sw <= med)); ww = w[m]
                if not m.any(): cells.append(dict(share=0, bet=0, ex=[])); continue
                cls = {}
                for j in np.flatnonzero(m):
                    h = names[j]; k = h[0] + h[2] + ('' if h[0] == h[2] else 's' if h[1] == h[3] else 'o'); cls[k] = cls.get(k, 0) + w[j]
                cells.append(dict(share=round(float(ww.sum() / w.sum()), 3), bet=round(float((ww * act[m]).sum() / ww.sum()), 3), ex=[k for k, _ in sorted(cls.items(), key=lambda x: -x[1])[:3]]))
        d['map'] = cells
    out[key] = d
json.dump(out, open('data.json', 'w'), separators=(',', ':'))
for k, d in out.items(): print(k, d['spot'], d['board'], d['seat'], d['actions'], 'top70', d['top70'], 'shape', d['shape'], d['profile'], d.get('price'), d.get('priceRank'), d.get('cont'), d.get('map'))
