# Data for "lines through the bar": turn betting decisions as 60 slices by equity (weakest first), each slice with what it
# does and four measures of its hands. The first spot is the clearest found; the next two are simply the next ones in the file.
import json, numpy as np
SRC = '../../insight/out/hands-7.jsonl'; KEYS = [('e', 'eq'), ('now', 'show'), ('draw', 'draw'), ('top', 'best')]; out = []; want = {('SRP-SB-BB Ad8h5d', 'Ad 8h 5d 7d', 'xx|x')}; extra = 0
for l in open(SRC):
    r = json.loads(l); key = (r['spot'], r['board'], r['line'])
    if len(r['board'].split()) != 4 or r['toCall'] > 0: continue
    hs = [h for h in r['hands'] if h['w'] > 0 and h['e'] is not None and h.get('now') is not None and h.get('top') is not None]
    if len(hs) < 80 or min(r['reach']) < 0.3: continue
    w = np.array([h['w'] for h in hs]); P = np.array([h['p'] for h in hs]); y = float((w * (1 - P[:, 0])).sum() / w.sum())
    if key not in want and not (extra < 2 and 0.3 < y < 0.7 and r['spot'] not in {o['spot'] + ' ' + o['flop'] for o in out} and out): continue
    if key not in want: extra += 1
    e = np.array([h['e'] for h in hs]); o = np.argsort(e, kind='stable'); c = np.cumsum(w[o]) / w.sum(); b = np.minimum((c * 60 - 1e-9).astype(int), 59); sl = []
    for i in range(60):
        m = b == i
        if not m.any(): sl.append(sl[-1]); continue
        ww = w[o][m]; row = {'mix': [round(float(x), 3) for x in (P[o][m] * ww[:, None]).sum(0) / ww.sum()]}
        for src, name in KEYS: row[name] = round(float((np.array([hs[j][src] for j in o[m]]) * ww).sum() / ww.sum()), 3)
        j = o[m][int(np.argmax(ww))]; row['ex'] = hs[j]['h']; sl.append(row)
    pre, flop = r['spot'].split(); out.append(dict(spot=pre, flop=flop, board=r['board'], seat=r['seat'], line=r['line'], actions=[dict(label=a['label'], kind=a['kind'], freq=round(a['freq'], 3)) for a in r['actions']], slices=sl))
    if len(out) == 3: break
json.dump(out, open('lines.json', 'w'), separators=(',', ':')); print([(o['spot'], o['board'], o['line'], o['actions']) for o in out])
