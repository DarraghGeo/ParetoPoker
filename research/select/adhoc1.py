import sys, collections
from category import load
spots = load(sys.argv[1], sys.argv[2]); cat = sys.argv[3]
# by hand equity band x nut advantage sign: solver bet%, gap, may check / may bet, best size among bettors, and size losses
def band(e): return '95+' if e >= .95 else '85-95' if e >= .85 else '70-85' if e >= .7 else '50-70' if e >= .5 else '<50'
acc = collections.defaultdict(lambda: collections.Counter())
for d in spots:
    bets = [a for a, k in enumerate(d['kinds']) if k != 'check']
    na = 'ahead' if d['nutAdv'] > 0 else 'behind'; deep = 'deep' if d['spr'] >= 1.5 else 'short'
    for h in d['hands']:
        if h['cat'] != cat: continue
        c = acc[(na, band(h['e']))]; w = h['w']; c['w'] += w; c['pbet'] += w * h['pbet']; c['gap'] += w * h['gap']; c['okc'] += w * (h['gap'] <= .5); c['okb'] += w * (h['gap'] >= -.5)
        if len(bets) >= 3:
            top = max(h['v']); c['w3'] += w
            for j, a in enumerate(bets[:3]): c[f'L{j}'] += w * (top - h['v'][a]); c[f'ok{j}'] += w * (top - h['v'][a] <= .5); c[f'p{j}'] += w * h['p'][a]
            c['Lc'] += w * (top - h['v'][0])
print('nutAdv | hand equity | weight | solver bets | gap | may check | may bet | loss if: check / small / 3-4 / big | within tol: small / 3-4 / big | solver uses small / 3-4 / big')
for k in sorted(acc):
    c = acc[k]; W = c['w']; W3 = c['w3'] or 1
    print(f"{k[0]:6s} | {k[1]:6s} | {W:6.1f} | {100*c['pbet']/W:3.0f}% | {c['gap']/W:+5.1f} | {100*c['okc']/W:3.0f}% | {100*c['okb']/W:3.0f}% | {c['Lc']/W3:.2f} / {c['L0']/W3:.2f} / {c['L1']/W3:.2f} / {c['L2']/W3:.2f} | {100*c['ok0']/W3:.0f}% / {100*c['ok1']/W3:.0f}% / {100*c['ok2']/W3:.0f}% | {100*c['p0']/W3:.0f}% / {100*c['p1']/W3:.0f}% / {100*c['p2']/W3:.0f}%")
