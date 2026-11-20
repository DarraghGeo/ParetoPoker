"""River, first to act: how good is a lookup policy, and which keys does it need?
A policy maps a key (hand category, the hand's equity band, who has the nut advantage, depth...) to one action (check,
small, three-quarter or big bet). The action for each key is the one losing least on the even-numbered spots; the score
is on the odd ones: mean loss per hand and the share of hands losing more than the tolerance, % of the pot.
  python3 research/select/lookup.py <select-river.jsonl> <first-oop|first-ip> [show]"""
import sys, collections
from category import load, TOL, ORDER

ACTS = ['check', 'small', 'three quarters', 'big']


def eband(e): return '95+' if e >= .95 else '85-95' if e >= .85 else '70-85' if e >= .7 else '50-70' if e >= .5 else '30-50' if e >= .3 else 'under 30'


KEYS = {
    'category': lambda d, h: h['cat'],
    'equity': lambda d, h: eband(h['e']),
    'nut advantage': lambda d, h: 'ahead' if d['nutAdv'] > 0 else 'behind',
    'depth': lambda d, h: 'short' if d['spr'] < 1.5 else 'deep',
    'range equity': lambda d, h: 'range ahead' if d['rangeEq'] > 0.5 else 'range behind',
    'his strong share': lambda d, h: 'he is strong' if d['hisStrong'] > 0.2 else 'he is not',
    'he bets after check': lambda d, h: 'he bets a lot' if (d.get('hisBetsAfter') or 0) > 0.4 else 'he bets little',
    'pot type': lambda d, h: d['pre'].split('-')[0],
}


def fit(spots, names):
    acc = collections.defaultdict(lambda: [0.0] * 5)
    for d in spots:
        for h in d['hands']:
            k = tuple(KEYS[n](d, h) for n in names); a = acc[k]; top = max(h['v'][:4])
            for j in range(4): a[j] += h['w'] * (top - h['v'][j])
            a[4] += h['w']
    return {k: min(range(4), key=lambda j: a[j]) for k, a in acc.items()}, acc


def score(spots, names, table):
    L = W = over = 0.0; by = collections.defaultdict(lambda: [0.0, 0.0, 0.0])
    for d in spots:
        for h in d['hands']:
            j = table.get(tuple(KEYS[n](d, h) for n in names), 0); loss = max(h['v'][:4]) - h['v'][j]; L += h['w'] * loss; W += h['w']; over += h['w'] * (loss > TOL)
            b = by[h['cat']]; b[0] += h['w'] * loss; b[1] += h['w']; b[2] += h['w'] * (loss > TOL)
    return L / W, over / W, by


def main(path, sit, show=None):
    spots = [d for d in load(path, sit) if d['nbets'] >= 3 and d['kinds'][1:4] == ['bet', 'bet', 'bet']]; train = spots[::2]; test = spots[1::2]
    print(f'# Lookup policies, {sit}: {len(spots)} spots with three bet sizes\n\n| Keys | Cells | Mean loss | Over tolerance | ' + ' | '.join(ORDER) + ' |\n|---|---|---|---|' + '---|' * len(ORDER))
    sets = [[], ['category'], ['equity'], ['category', 'equity'], ['category', 'nut advantage'], ['equity', 'nut advantage'], ['category', 'equity', 'nut advantage'], ['category', 'equity', 'depth'], ['category', 'equity', 'range equity'],
            ['category', 'equity', 'his strong share'], ['category', 'equity', 'he bets after check'], ['category', 'equity', 'pot type'], ['category', 'equity', 'nut advantage', 'depth'], ['category', 'equity', 'nut advantage', 'he bets after check'], ['equity', 'nut advantage', 'depth']]
    for names in sets:
        table, _ = fit(train, names); L, over, by = score(test, names, table)
        print(f"| {' x '.join(names) or 'always check'} | {len(table)} | {L:.2f} | {100 * over:.0f}% | " + ' | '.join(f'{by[c][0] / by[c][1]:.2f}' if by[c][1] else '-' for c in ORDER) + ' |')
    if show:
        names = show.split(','); table, acc = fit(spots, names); print(f"\nThe table for {' x '.join(names)} (all spots): action, loss in the cell, share of range")
        W = sum(a[4] for a in acc.values())
        for k in sorted(table, key=lambda k: tuple(ORDER.index(x) if x in ORDER else x for x in k)): a = acc[k]; print(f"  {' | '.join(k):45s} -> {ACTS[table[k]]:15s} loss {a[table[k]] / a[4]:.2f}  (check {a[0] / a[4]:.2f}, small {a[1] / a[4]:.2f}, 3/4 {a[2] / a[4]:.2f}, big {a[3] / a[4]:.2f})  {100 * a[4] / W:.1f}%")


if __name__ == "__main__": main(*sys.argv[1:4])
