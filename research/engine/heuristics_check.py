# Do the general heuristics describe what the solver does? Read off stored solved decisions (store.mjs rows: real flop,
# turn and river lines; the turn and river sets offer three bet sizes). First to act only.
#   STORE=<dir with fullhand.jsonl, turn-real.jsonl, river-real.jsonl> python3 research/engine/heuristics_check.py
import json, os, collections
import numpy as np
S = os.environ['STORE']; ST = {3: 'flop', 4: 'turn', 5: 'river'}; SEAT = ['out of position', 'in position']; D = []
def size_of(a, pot): x = a['add'] / pot; return None if a['kind'] == 'check' else 'small (about a third)' if x < 0.5 else 'medium (about three quarters)' if x < 1.1 else 'big (overbet or all-in)'
for name, streets in (('fullhand', (3,)), ('turn-real', (4,)), ('river-real', (5,))):
    for t in open(os.path.join(S, name + '.jsonl')):
        d = json.loads(t); st = len(d['board'].split())
        if st not in streets or d['toCall'] > 0: continue
        w = np.array([h['w'] for h in d['hands']]); e = np.array([h['e'] for h in d['hands']]); P = np.array([h['p'] for h in d['hands']]); w = w / w.sum(); sizes = [size_of(a, d['pot']) for a in d['actions']]
        band = np.digitize(e, [0.35, 0.65]); bw = np.array([w[band == k].sum() for k in range(3)]); rec = dict(street=st, seat=d['seat'], role=d['role'], re=float(w @ e), spr=d['behind'] / d['pot'], pot=d['action'], bands=bw, by={})
        for sz in set(s for s in sizes if s): p = P[:, [i for i, s in enumerate(sizes) if s == sz]].sum(1); rec['by'][sz] = (float(w @ p), np.array([(w * p)[band == k].sum() / bw[k] if bw[k] > 0.02 else np.nan for k in range(3)]))
        p = P[:, [i for i, s in enumerate(sizes) if s]].sum(1); rec['bet'] = float(w @ p); rec['rates'] = np.array([(w * p)[band == k].sum() / bw[k] if bw[k] > 0.02 else np.nan for k in range(3)]); D.append(rec)
def polar(r): return 1 - r[1] / np.nanmean([r[0], r[2]]) if np.nanmean([r[0], r[2]]) > 0.02 and not np.isnan(r[1]) else np.nan      # 0: the middle bets as often as the ends (merged); 1: the middle never bets (polar)
pc = lambda x: '-' if x is None or np.isnan(x) else f'{100 * x:.0f}%'
print(f'# Do the general heuristics describe the solver? ({len(D)} first-to-act decisions from stored solves)\n')
print('Weak = under 35% equity, middle = 35-65%, strong = 65%+. Polarity: 0 when the middle bets as often as the ends (merged), 100 when the middle never bets.\n')
print('## 1. Merged on the flop, polar later\n'); print('| street | seat | decisions | bets | weak bets | middle bets | strong bets | polarity |'); print('|---|---|---|---|---|---|---|---|')
for st in (3, 4, 5):
    for s in (0, 1):
        g = [r for r in D if r['street'] == st and r['seat'] == s and r['bet'] > 0.05]; a = [r for r in D if r['street'] == st and r['seat'] == s]
        if a: R = np.nanmean([r['rates'] for r in g], 0); print(f"| {ST[st]} | {SEAT[s]} | {len(a)} | {pc(np.mean([r['bet'] for r in a]))} | {pc(R[0])} | {pc(R[1])} | {pc(R[2])} | {pc(np.nanmean([polar(r['rates']) for r in g]))} |")
print('\n(the band rates and polarity are over the decisions that bet at least 5% of the time)\n')
BIN = [(0, .42, 'under 42%'), (.42, .47, '42-47%'), (.47, .53, '47-53%'), (.53, .58, '53-58%'), (.58, 2, '58%+')]
for s, title in ((0, '## 2. Out of position: check unless ahead, then bet in proportion'), (1, '## 3. In position, checked to: bet unless clearly behind')):
    print(title + '\n'); print('Bet frequency by the range\'s equity (number of decisions in brackets).\n'); print('| range equity | ' + ' | '.join(ST[st] for st in (3, 4, 5)) + ' |'); print('|---|---|---|---|')
    for lo, hi, nm in BIN: print(f'| {nm} | ' + ' | '.join((lambda g: f"{pc(np.mean([r['bet'] for r in g]))} ({len(g)})" if len(g) >= 5 else '-')([r for r in D if r['street'] == st and r['seat'] == s and lo <= r['re'] < hi]) for st in (3, 4, 5)) + ' |')
    for st in (3, 4, 5): g = [r for r in D if r['street'] == st and r['seat'] == s]; print(f"\n{ST[st]}: correlation of bet frequency with range equity {np.corrcoef([r['re'] for r in g], [r['bet'] for r in g])[0, 1]:+.2f}; a straight line gives {(lambda b: f'{10 * b[1]:.0f} points of betting for each 10 points of range equity, crossing 50% betting at {100 * (0.5 - b[0]) / b[1]:.0f}% equity')(np.polyfit([r['re'] for r in g], [r['bet'] for r in g], 1)[::-1])}")
    print('\nBy who bet the street before (bet frequency, flop / turn / river):'); [print(f"- {role}: " + ' / '.join(pc(np.mean([r['bet'] for r in D if r['street'] == st and r['seat'] == s and r['role'] == role]) if any(r['street'] == st and r['seat'] == s and r['role'] == role for r in D) else None) for st in (3, 4, 5))) for role in ('led', 'followed', 'none')]; print()
print('## 4. Polarity goes with bet size\n'); print('| street | seat | size | share of the range using it | weak | middle | strong | polarity |'); print('|---|---|---|---|---|---|---|---|')
for st in (3, 4, 5):
    for s in (0, 1):
        for sz in ('small (about a third)', 'medium (about three quarters)', 'big (overbet or all-in)'):
            a = [r for r in D if r['street'] == st and r['seat'] == s and sz in r['by']]; g = [r for r in a if r['by'][sz][0] > 0.03]
            if len(a) >= 10 and g: R = np.nanmean([r['by'][sz][1] for r in g], 0); print(f"| {ST[st]} | {SEAT[s]} | {sz} | {pc(np.mean([r['by'][sz][0] for r in a]))} | {pc(R[0])} | {pc(R[1])} | {pc(R[2])} | {pc(np.nanmean([polar(r['by'][sz][1]) for r in g]))} |")
print('\n(band rates and polarity over the decisions that use the size at least 3% of the time)\n')
print('## 5. In position on the flop: merged whatever the equity?\n'); print('| range equity | decisions | bets | weak | middle | strong | polarity |'); print('|---|---|---|---|---|---|---|')
for lo, hi, nm in BIN:
    g = [r for r in D if r['street'] == 3 and r['seat'] == 1 and lo <= r['re'] < hi]
    if len(g) >= 5: gg = [r for r in g if r['bet'] > 0.05]; R = np.nanmean([r['rates'] for r in gg], 0) if gg else [np.nan] * 3; print(f"| {nm} | {len(g)} | {pc(np.mean([r['bet'] for r in g]))} | {pc(R[0])} | {pc(R[1])} | {pc(R[2])} | {pc(np.nanmean([polar(r['rates']) for r in gg])) if gg else '-'} |")
