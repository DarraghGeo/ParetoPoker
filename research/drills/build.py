# Assembles the data for the all-drills mock-up from real ranges and solved spots, and writes the page.
import json, subprocess, itertools, collections
R = '23456789TJQKA'
js = "import('../../web/lib/study/presets.js').then(m=>console.log(JSON.stringify(m.PRESETS.filter(p=>p.action!=='Limped').map(p=>({pre:`${p.action}-${p.oop}-${p.ip}`,ranges:[p.ranges.oop,p.ranges.ip]})))))"
PRE = {p['pre']: p['ranges'] for p in json.loads(subprocess.check_output(['node', '-e', js]))}
def weights(text):
    w = {}
    for part in text.split(','):
        name, _, wt = part.strip().partition(':')
        if name: w[name] = float(wt) if wt else 1.0
    return w
def grid(text):   # 13 by 13, aces first; suited above the diagonal
    w = weights(text); g = []
    for i in range(12, -1, -1):
        row = []
        for j in range(12, -1, -1):
            name = R[i] * 2 if i == j else (R[max(i, j)] + R[min(i, j)] + ('s' if j < i else 'o'))
            row.append(round(w.get(name, 0), 2))
        g.append(row)
    return g
def rankshare(text):
    w = weights(text); tot = 0; has = collections.defaultdict(float)
    for name, x in w.items():
        n = 6 if len(name) == 2 else 4 if name.endswith('s') else 12; tot += n * x
        for r in set(name[:2]): has[r] += n * x
    return {r: round(has[r] / tot, 3) for r in R}
D = {}
D['grids'] = [dict(label='UTG opens: the opening range', g=grid(PRE['SRP-BB-UTG'][1])), dict(label='BU opens: the opening range', g=grid(PRE['SRP-BB-BU'][1])), dict(label='BB calls a BU open', g=grid(PRE['SRP-BB-BU'][0])), dict(label='SB 3-bets a BU open', g=grid(PRE['3BP-SB-BU'][0]))]
bb = weights(PRE['SRP-BB-BU'][0]); D['inout'] = dict(who='BB', line='BU opens, BB calls', hands=[(h, round(bb.get(h, 0), 2)) for h in ['K7s', 'AKo', 'T8s', 'Q9o', '55', 'A5s', 'J7o']])
a, b = rankshare(PRE['SRP-BB-BU'][0]), rankshare(PRE['SRP-BB-BU'][1]); D['cards'] = dict(names=['BB', 'BU'], line='BU opens, BB calls', share={r: [a[r], b[r]] for r in R})
D['adv'] = json.load(open('../advantage/mockup/questions.json')); D['turn'] = json.load(open('turn.json'))
c = json.load(open('../charts/mockup/data.json')); D['river'] = {k: c['river'][k] for k in ('spot', 'board', 'actions', 'top70', 'shape', 'profile')}; D['river']['bar'] = [b['mix'] for b in reversed(c['river']['mine'])]
D['face'] = {k: c['face'][k] for k in ('spot', 'board', 'pot', 'toCall', 'cont', 'price', 'priceRank')}; D['face']['bar'] = [b['mix'] for b in reversed(c['face']['mine'])]
print({k: (len(v) if isinstance(v, list) else list(v)[:6]) for k, v in D.items()}); print(D['inout']['hands']); print({r: v for r, v in D['cards']['share'].items()})
open('pareto-drills.html', 'w').write(open('drills.template.html').read().replace('/*DATA*/', json.dumps(D, separators=(',', ':')))) if __import__('os').path.exists('drills.template.html') else None
