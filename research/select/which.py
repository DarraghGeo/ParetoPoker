"""River: given that a category bets (or continues) X% of the time in a spot, which actual hands do it?
The solver's share for the category in the spot is kept; hands are picked by a feature a player can see on the cards.
Reported: mean loss per hand (% of the pot) on the spots where the category mixes (solver share 10-90%), against a
random pick (ceiling) and the best possible pick (floor).
  python3 which.py <select-river.jsonl> <first-oop|first-ip|facing-oop|facing-ip> [category] [examples]"""
import sys, json, collections
from category import CATS, ORDER

R = '23456789TJQKA'


def visible(d, h):
    """Card features of a hand on this board. The board is flop, turn, river in order."""
    b = d['board'].split(); br = [R.index(c[0]) for c in b]; bs = [c[1] for c in b]; c1, c2 = h['h'][:2], h['h'][2:]; r = sorted([R.index(c1[0]), R.index(c2[0])], reverse=True); s = [c1[1], c2[1]]
    ranks = sorted(set(br), reverse=True); suit_n = collections.Counter(bs); fs = [x for x, n in suit_n.items() if n >= 3]
    f = {'high card': r[0], 'low card': r[1], 'pocket pair': int(r[0] == r[1]), 'suited': int(s[0] == s[1]), 'strength in category': h['e']}
    f['holds a top-card rank'] = int(ranks[0] in r); f['holds an ace'] = int(12 in r)
    f['cards above the top card'] = sum(x > ranks[0] for x in r)
    f['holds the flush suit'] = sum(x in fs for x in s) if fs else None
    if fs: f['flush-suit card rank'] = max([R.index(c[0]) for c in (c1, c2) if c[1] in fs], default=-1)
    # straights: ranks that sit inside a 5-rank window holding 3+ board ranks
    window = set()
    for top in range(12, 2, -1):
        w = [(top - k) % 13 if top - k >= 0 else 12 for k in range(5)]
        if sum(x in br for x in set(w)) >= 3: window |= set(w) - set(br)
    f['holds straight cards'] = sum(x in window for x in r) if window else None
    # which board card the hand pairs (0 = top), for one-pair and trips hands
    hit = [ranks.index(x) for x in r if x in ranks]; f['pairs the higher board card'] = -min(hit) if hit else None
    f['kicker'] = h['kick'] if h['row'] in (2, 3, 4) and r[0] != r[1] else None
    # the turn: did the hand hold a draw that missed?
    t = bs[:4]; fd = any(s.count(x) + t.count(x) == 4 and s.count(x) >= 1 for x in set(s)) and not any(s.count(x) + bs.count(x) >= 5 for x in set(s))
    f['missed flush draw'] = int(fd)
    tr = set(br[:4]) | set(r); sd = any(sum(((top - k) if top - k >= 0 else 12) in tr for k in range(5)) == 4 for top in range(12, 2, -1))
    f['missed straight draw'] = int(sd and h['row'] <= 1); f['missed any draw'] = int((fd or sd) and h['row'] <= 1) if h['row'] <= 1 else None
    f['river card helped'] = int(br[4] in r)
    return f


def load(path, sit):
    kind, seat = sit.split('-'); seat = 0 if seat == 'oop' else 1; out = []
    for t in open(path):
        d = json.loads(t)
        if d['seat'] != seat or (d['toCall'] > 0) != (kind == 'facing'): continue
        if kind == 'facing' and (d['line'].count('b') + d['line'].count('a') + d['line'].count('r') > 1): continue
        for h in d['hands']:
            h['cat'] = CATS[h['row']]
            if kind == 'first': h['gap'] = max(h['v'][1:]) - h['v'][0]; h['share'] = 1 - h['p'][0]
            else: fi = d['kinds'].index('fold'); h['gap'] = max(v for a, v in enumerate(h['v']) if a != fi) - h['v'][fi]; h['share'] = 1 - h['p'][fi]
        out.append(d)
    return out


def loss_of(hs, order):
    need = sum(h['w'] * h['share'] for h in hs); L = 0.0
    for h in order: t = min(h['w'], need); need -= t; L += t * max(-h['gap'], 0) + (h['w'] - t) * max(h['gap'], 0)
    return L


def main(path, sit, only=None, examples=None):
    spots = load(path, sit); verb = 'bet' if sit.startswith('first') else 'continue'
    for cat in ([only] if only else ORDER):
        res = collections.defaultdict(lambda: [0.0, 0.0, 0]); n = 0; shown = 0
        for d in spots:
            hs = [h for h in d['hands'] if h['cat'] == cat]; w = sum(h['w'] for h in hs)
            if w < 0.02 or len(hs) < 8: continue
            share = sum(h['w'] * h['share'] for h in hs) / w
            if not 0.1 <= share <= 0.9: continue
            n += 1; F = {h['h']: visible(d, h) for h in hs}
            base = {'random': sorted(hs, key=lambda h: hash(h['h']) % 997), 'best possible': sorted(hs, key=lambda h: -h['gap'])}
            for name, order in base.items(): r = res[(name, 0)]; r[0] += loss_of(hs, order); r[1] += w; r[2] += 1
            for f in next(iter(F.values())):
                vals = [F[h['h']][f] for h in hs]
                if any(v is None for v in vals) or len(set(vals)) < 2: continue
                for sign in (1, -1): r = res[(f, sign)]; r[0] += loss_of(hs, sorted(hs, key=lambda h: (-sign * F[h['h']][f], hash(h['h']) % 997))); r[1] += w; r[2] += 1
            if examples and shown < int(examples) and n % 7 == 1:
                shown += 1; top = sorted(hs, key=lambda h: -h['gap']); print(f"  example {d['board']} ({d['pre']}), {cat} {verb}s {100 * share:.0f}%: most want to {verb}: " + ' '.join(f"{h['h']}({h['gap']:+.1f})" for h in top[:8]) + ' | least: ' + ' '.join(f"{h['h']}({h['gap']:+.1f})" for h in top[-8:]))
        if n < 8: continue
        rnd = res[('random', 0)]; best = res[('best possible', 0)]
        print(f"\n### {cat}, {sit}: mixes in {n} spots. Random pick {rnd[0] / rnd[1]:.2f}, best possible {best[0] / best[1]:.2f}")
        rows = sorted(((k, r[0] / r[1], r[2]) for k, r in res.items() if k[1] != 0 and r[2] >= max(6, n // 5)), key=lambda x: x[1])
        for (f, sign), L, m in rows[:7]: print(f"  {L:.2f}  the ones that {verb}: {'most / highest' if sign > 0 else 'least / lowest'} {f}  ({m} spots)")
        print('  worst: ' + '; '.join(f"{'highest' if s > 0 else 'lowest'} {f} {L:.2f}" for (f, s), L, m in rows[-3:]))


if __name__ == '__main__': main(*sys.argv[1:5])
