# Charts study: one compact record a solved decision, from the hand-by-hand collections of research/insight.
import glob, json, re, pickle, os, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.join(HERE, '..', 'insight', 'out'); CACHE = os.path.join(HERE, 'out', 'decisions.pkl')
RANKS = '23456789TJQKA'
def cls(h):
    a, b = RANKS.index(h[0]), RANKS.index(h[2]); hi, lo = max(a, b), min(a, b); return hi * 13 + lo if h[1] == h[3] else lo * 13 + hi if hi != lo else hi * 13 + hi
def kind(h):
    if h['made'] >= 2: return 'made%d' % min(h['made'], 6)
    d = ('f' if h['fo'] >= 8 else '') + ('s' if h['so'] >= 8 else 'g' if h['so'] >= 4 else '')
    return (h['pair'] if h['own'] == 1 else 'none') + ('+' + d if d else '')
def load():
    if os.path.exists(CACHE): return pickle.load(open(CACHE, 'rb'))
    files = sorted(glob.glob(os.path.join(SRC, 'full-*.jsonl'))) + [f for f in sorted(glob.glob(os.path.join(SRC, 'hands-*.jsonl'))) if int(re.search(r'hands-(\d+)', f).group(1)) >= 7]
    out = []
    for f in files:
        for line in open(f):
            r = json.loads(line); hs = [h for h in r['hands'] if h['w'] > 0 and h['e'] is not None]
            if len(hs) < 20 or not r.get('vr') or min(r['reach']) < 0.02: continue
            kinds = [a['kind'] for a in r['actions']]; facing = r['toCall'] > 0; pot = r['pot']
            agg = np.array([0.0 if k in (('fold',) if facing else ('check',)) else 1.0 for k in kinds])
            wager = np.array([1.0 if k in ('bet', 'raise', 'allin') else 0.0 for k in kinds]); add = np.array([a['add'] for a in r['actions']], float)
            P = np.array([h['p'] for h in hs], float); w = np.array([h['w'] for h in hs], float); freq = (P * w[:, None]).sum(0) / w.sum()
            bets = freq * wager; size = float((bets * add).sum() / bets.sum() / pot) if bets.sum() > 0.05 and not facing else np.nan
            out.append(dict(spot=r['spot'], pre=r['action'], board=r['board'], street=len(r['board'].split()), line=r['line'], seat=r['seat'], facing=facing, s=r['toCall'] / max(pot - r['toCall'], 1e-9) if facing else 0.0, spr=r['behind'] / pot,
                            e=np.array([h['e'] for h in hs], np.float32), w=w.astype(np.float32), act=(P @ agg).astype(np.float32), wag=(P @ wager).astype(np.float32), now=np.array([h['now'] if h['now'] is not None else np.nan for h in hs], np.float32), draw=np.array([h['draw'] if h['draw'] is not None else 0 for h in hs], np.float32),
                            v=np.array([h.get('v') if h.get('v') is not None else np.nan for h in hs], np.float32), top=np.array([h['top'] if h.get('top') is not None else np.nan for h in hs], np.float32), down=np.array([h['down'] if h.get('down') is not None else np.nan for h in hs], np.float32), up=np.array([h['up'] if h.get('up') is not None else np.nan for h in hs], np.float32), own=np.array([h['own'] for h in hs], np.int8), made=np.array([h['made'] for h in hs], np.int8), cls=np.array([cls(h['h']) for h in hs], np.int16), kind=[kind(h) for h in hs], outs=np.array([h['fo'] + h['so'] for h in hs], np.int8),
                            he=np.array([x[2] if x[2] is not None else np.nan for x in r['vr']], np.float32), hw=np.array([x[1] for x in r['vr']], np.float32), y=float((freq * agg).sum()), raise_=float((freq * wager).sum()) if facing else np.nan, size=size, nsizes=int(wager.sum())))
    pickle.dump(out, open(CACHE, 'wb')); return out
if __name__ == '__main__':
    d = load(); print(len(d), 'decisions;', len({x['spot'] for x in d}), 'spots'); import collections; print(collections.Counter((x['street'], x['facing']) for x in d))
