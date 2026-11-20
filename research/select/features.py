"""Which characteristics make a hand better for an action than another hand of the same strength group in the same spot?
For each decision and group (weak / middle / strong by equity), hands are sorted by one characteristic; the gap
(aggressive action minus passive action, % of the pot) of the top third is compared with the bottom third.
  python3 research/select/features.py <select-file.jsonl>"""
import json, sys, collections, math

FEATS = ['e', 'ubFolds', 'ubCalls', 'ubStrong', 'ubWeak', 'row', 'kick', 'hi', 'pair', 'come', 'fd']
BANDS = [(i / 10, i / 10 + .1 + (.01 if i == 9 else 0)) for i in range(10)]   # hands are compared inside 10-point equity bands, so strength itself is held nearly level
GROUPS = [('weak, under 30%' if lo < .3 else 'middle, 30-70%' if lo < .7 else 'strong, 70%+', lo, hi) for lo, hi in BANDS]


def gap_of(d, h):
    """(name, gap) pairs: bet - check when first; call - fold and raise - call when facing."""
    v = collections.defaultdict(lambda: -1e9)
    for a, k in enumerate(d['kinds']):
        k = 'raise' if k in ('raise', 'allin') and d['toCall'] > 0 else 'bet' if k in ('bet', 'allin') else k
        v[k] = max(v[k], h['v'][a])
    if d['toCall'] <= 0: return [('bet - check', v['bet'] - v['check'])] if 'bet' in v else []
    out = [('call - fold', v['call'] - v['fold'])]
    if 'raise' in v: out.append(('raise - call', v['raise'] - v['call']))
    return out


def thirds(hands, key):
    xs = sorted(hands, key=key); tot = sum(h[0] for h in xs)
    if tot <= 0 or key(xs[0]) == key(xs[-1]): return None
    lo = hi = 0.0; wlo = whi = 0.0; acc = 0.0
    for w, g, f in xs:
        if acc < tot / 3: lo += w * g; wlo += w
        elif acc >= 2 * tot / 3: hi += w * g; whi += w
        acc += w
    return None if wlo <= 0 or whi <= 0 else hi / whi - lo / wlo


def main(path):
    eff = collections.defaultdict(lambda: [0.0, 0.0, 0]); spread = collections.defaultdict(lambda: [0.0, 0.0])
    for t in open(path):
        d = json.loads(t); sit = ('first' if d['toCall'] <= 0 else 'facing') + (' oop' if d['seat'] == 0 else ' ip')
        for gi, (gname, lo, hi) in enumerate(GROUPS):
            hs = [h for h in d['hands'] if lo <= h['e'] < hi]; wt = sum(h['w'] for h in hs)
            if wt < 0.03 or len(hs) < 6: continue
            for h in hs:
                for name, g in gap_of(d, h): h.setdefault('_g', {})[name] = g
            for name in hs[0].get('_g', {}):
                m = sum(h['w'] * h['_g'][name] for h in hs) / wt; sd = math.sqrt(sum(h['w'] * (h['_g'][name] - m) ** 2 for h in hs) / wt)
                s = spread[(sit, name, gname)]; s[0] += wt * sd; s[1] += wt
                for f in FEATS:
                    if hs[0].get(f) is None: continue
                    r = thirds([(h['w'], h['_g'][name], h[f]) for h in hs], key=lambda x: x[2])
                    if r is None: continue
                    e = eff[(sit, name, gname, f)]; e[0] += wt * r; e[1] += wt; e[2] += 1
    print(f'# {path.split("/")[-1]}: top third minus bottom third by each characteristic, % of the pot\n')
    for (sit, name, gname) in sorted(spread):
        s = spread[(sit, name, gname)]; row = []
        for f in FEATS:
            e = eff.get((sit, name, gname, f))
            if e and e[1] > 0 and e[2] >= 20: row.append((f, e[0] / e[1]))
        row.sort(key=lambda x: -abs(x[1]))
        print(f'{sit} | {name} | {gname} | spread within group {s[0] / s[1]:.1f} | ' + ', '.join(f'{f} {x:+.1f}' for f, x in row))


main(sys.argv[1])
