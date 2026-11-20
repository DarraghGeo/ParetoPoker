"""How much of a range is 'close to arbitrary'? For each tolerance (EV a hand may lose, in % of the pot at the decision),
the share of hands with two or more kinds of action inside it, and what the forced hands want.
  python3 research/select/band.py <select-file.jsonl>
Actions are grouped by kind (check, bet, fold, call, raise): a hand's value for 'bet' is its best bet size."""
import json, sys, collections

EPS = [0.05, 0.1, 0.25, 0.5, 1, 2, 5]
BANDS = [(0, .2), (.2, .35), (.35, .5), (.5, .65), (.65, .8), (.8, .9), (.9, 1.01)]


def kinds_of(d):
    """Map kind -> list of action indexes; 'bet' and 'raise' gather every size."""
    out = collections.OrderedDict()
    for a, k in enumerate(d['kinds']):
        out.setdefault('raise' if k in ('raise', 'allin') and d['toCall'] > 0 else 'bet' if k in ('bet', 'allin') else k, []).append(a)
    return out


def hand_view(d, h, groups):
    v = {k: max(h['v'][a] for a in idx) for k, idx in groups.items()}
    p = {k: sum(h['p'][a] for a in idx) for k, idx in groups.items()}
    best = max(v.values())
    return v, p, best


def situation(d):
    return ('first' if d['toCall'] <= 0 else 'facing') + (' oop' if d['seat'] == 0 else ' ip')


def main(path):
    free = collections.defaultdict(lambda: [0.0] * len(EPS)); tot = collections.Counter()
    byband = collections.defaultdict(lambda: collections.Counter()); n = collections.Counter()
    mixed = collections.Counter()
    for t in open(path):
        d = json.loads(t); groups = kinds_of(d); sit = situation(d)
        if len(groups) < 2: continue
        n[sit] += 1
        for h in d['hands']:
            v, p, best = hand_view(d, h, groups); w = h['w']; tot[sit] += w
            order = sorted(v.values(), reverse=True); gap = order[0] - order[1]
            for i, e in enumerate(EPS):
                if gap <= e: free[sit][i] += w
            if max(p.values()) < 0.95: mixed[sit] += w
            b = next(i for i, (lo, hi) in enumerate(BANDS) if lo <= h['e'] < hi)
            top = max(v, key=v.get); c = byband[(sit, b)]; c['w'] += w
            c['free'] += w if gap <= 0.5 else 0
            if gap > 0.5: c['must ' + top] += w
    print(f'# {path.split("/")[-1]}\n')
    print('Share of the range (by weight) with two or more kinds of action within the tolerance of its best.\n')
    print('| Situation | Decisions | Solver mixes | ' + ' | '.join(f'{e}%' for e in EPS) + ' |'); print('|---|---|---|' + '---|' * len(EPS))
    for sit in sorted(tot):
        print(f'| {sit} | {n[sit]} | {100 * mixed[sit] / tot[sit]:.0f}% | ' + ' | '.join(f'{100 * x / tot[sit]:.0f}%' for x in free[sit]) + ' |')
    print('\nAt a tolerance of 0.5% of the pot, by equity band: share of the range in the band, how much of it is free, and what the rest must do.\n')
    for sit in sorted(tot):
        names = sorted({k for (s, b), c in byband.items() if s == sit for k in c if k.startswith('must')})
        print(f'**{sit}**\n\n| Equity | Of range | Free | ' + ' | '.join(names) + ' |'); print('|---|---|---|' + '---|' * len(names))
        for b, (lo, hi) in enumerate(BANDS):
            c = byband[(sit, b)]
            if c['w'] <= 0: continue
            print(f'| {int(lo * 100)}-{min(100, int(hi * 100))}% | {100 * c["w"] / tot[sit]:.0f}% | {100 * c["free"] / c["w"]:.0f}% | ' + ' | '.join(f'{100 * c[k] / c["w"]:.0f}%' for k in names) + ' |')
        print()


main(sys.argv[1])
