"""The river facing a bet (or a raise), one hand category at a time: fold, call or raise.
  python3 facing.py <select-river.jsonl> <oop|ip> <bet|raise> [show]
Tolerance 0.5% of the pot before the bet. Lookup actions are fitted on even spots and scored on odd ones."""
import sys, json, collections, math
from category import CATS, ORDER, TOL, corr

def eband(e): return '95+' if e >= .95 else '85-95' if e >= .85 else '70-85' if e >= .7 else '50-70' if e >= .5 else '40-50' if e >= .4 else '30-40' if e >= .3 else '20-30' if e >= .2 else 'under 20'
def load(path, seat, what):
    out = []
    for t in open(path):
        d = json.loads(t)
        if d['toCall'] <= 0 or d['seat'] != seat: continue
        isRaise = d['line'].endswith('r') or (d['line'].count('b') + d['line'].count('a') > 1) or d['line'] in ('ba', 'xba')
        if (what == 'raise') != isRaise: continue
        before = d['potNow'] - d['toCall'] if not isRaise else None; d['frac'] = d['toCall'] / before if before else None
        d['size'] = 'raise' if isRaise else ('small' if d['frac'] < 0.5 else 'three quarters' if d['frac'] < 1.1 else 'big')
        fi = d['kinds'].index('fold'); ci = d['kinds'].index('call'); ri = [a for a, k in enumerate(d['kinds']) if k in ('raise', 'allin')]
        for h in d['hands']:
            h['cat'] = CATS[h['row']]; h['V'] = [h['v'][fi], h['v'][ci], max([h['v'][a] for a in ri], default=h['v'][ci])]; h['P'] = [h['p'][fi], h['p'][ci], sum(h['p'][a] for a in ri)]
        W = sum(h['w'] for h in d['hands']); d['rangeEq'] = sum(h['w'] * h['e'] for h in d['hands']) / W; d['myStrong'] = sum(h['w'] for h in d['hands'] if h['e'] >= .8) / W
        d['canRaise'] = bool(ri); d['price'] = d['toCall'] / (d['potNow'] + d['toCall']); out.append(d)
    return out
KEYS = {'category': lambda d, h: h['cat'], 'equity': lambda d, h: eband(h['e']), 'size': lambda d, h: d['size'], 'his strong share': lambda d, h: 'he is polar-strong' if d['hisStrong'] > 0.5 else 'he has less value',
        'range equity': lambda d, h: 'range ahead' if d['rangeEq'] > 0.45 else 'range behind', 'vs price': lambda d, h: 'far over' if h['e'] > d['price'] + .15 else 'over' if h['e'] > d['price'] + .03 else 'at' if h['e'] > d['price'] - .03 else 'under' if h['e'] > d['price'] - .12 else 'far under'}
ACTS = ['fold', 'call', 'raise']
def fit(spots, names):
    acc = collections.defaultdict(lambda: [0.0] * 4)
    for d in spots:
        for h in d['hands']:
            a = acc[tuple(KEYS[n](d, h) for n in names)]; top = max(h['V'])
            for j in range(3): a[j] += h['w'] * (top - h['V'][j])
            a[3] += h['w']
    return {k: min(range(3), key=lambda j: a[j]) for k, a in acc.items()}, acc
def score(spots, names, table):
    L = W = over = 0.0; by = collections.defaultdict(lambda: [0.0, 0.0])
    for d in spots:
        for h in d['hands']:
            j = table.get(tuple(KEYS[n](d, h) for n in names), 1); loss = max(h['V']) - h['V'][j]; loss = min(loss, 200); L += h['w'] * loss; W += h['w']; over += h['w'] * (loss > TOL); b = by[h['cat']]; b[0] += h['w'] * loss; b[1] += h['w']
    return L / W, over / W, by
def main(path, seat, what, show=None):
    spots = load(path, 0 if seat == 'oop' else 1, what); train = spots[::2]; test = spots[1::2]
    print(f'# Facing a {what}, {seat}: {len(spots)} decisions\n\n| Category | Of range | Equity | Solver fold / call / raise | May fold | May call | May raise | Free | Always call costs | Always fold costs |\n|---|---|---|---|---|---|---|---|---|---|')
    for cat in ORDER:
        c = collections.Counter(); n = 0
        for d in spots:
            n += sum(h['w'] for h in d['hands'])
            for h in d['hands']:
                if h['cat'] != cat: continue
                w = h['w']; top = max(h['V']); ok = [top - v <= TOL for v in h['V']]; c['w'] += w; c['e'] += w * h['e']
                for j in range(3): c[f'p{j}'] += w * h['P'][j]; c[f'ok{j}'] += w * ok[j]
                c['free'] += w * (sum(ok) >= 2); c['lc'] += w * (top - h['V'][1]); c['lf'] += w * (top - h['V'][0])
        W = c['w']
        if W: print(f"| {cat} | {100 * W / n:.0f}% | {100 * c['e'] / W:.0f}% | {100 * c['p0'] / W:.0f} / {100 * c['p1'] / W:.0f} / {100 * c['p2'] / W:.0f} | {100 * c['ok0'] / W:.0f}% | {100 * c['ok1'] / W:.0f}% | {100 * c['ok2'] / W:.0f}% | {100 * c['free'] / W:.0f}% | {c['lc'] / W:.2f} | {c['lf'] / W:.2f} |")
    print('\n| Lookup keys | Cells | Mean loss | Over tolerance | ' + ' | '.join(ORDER) + ' |\n|---|---|---|---|' + '---|' * 7)
    for names in [[], ['category'], ['equity'], ['vs price'], ['category', 'size'], ['equity', 'size'], ['category', 'equity'], ['category', 'vs price'], ['category', 'equity', 'size'], ['category', 'equity', 'his strong share'], ['category', 'equity', 'range equity'], ['category', 'equity', 'size', 'his strong share']]:
        table, _ = fit(train, names); L, over, by = score(test, names, table)
        print(f"| {' x '.join(names) or 'always call'} | {len(table)} | {L:.2f} | {100 * over:.0f}% | " + ' | '.join(f'{by[c][0] / by[c][1]:.2f}' if by[c][1] else '-' for c in ORDER) + ' |')
    if show:
        names = show.split(','); table, acc = fit(spots, names); W = sum(a[3] for a in acc.values()); print()
        for k in sorted(table, key=lambda k: tuple(ORDER.index(x) if x in ORDER else x for x in k)):
            a = acc[k]
            if a[3] / W >= 0.004: print(f"  {' | '.join(k):48s} -> {ACTS[table[k]]:5s} loss {a[table[k]] / a[3]:.2f}  (fold {a[0] / a[3]:.2f}, call {a[1] / a[3]:.2f}, raise {min(a[2] / a[3], 99):.2f})  {100 * a[3] / W:.1f}%")
if __name__ == '__main__': main(*sys.argv[1:5])
