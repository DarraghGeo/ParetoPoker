# Is the backdoor effect on sizing softened by reverse implied odds? Split each backdoor by how good the hand it draws to is:
# the hole card at the top, middle or bottom of the three-card run; the backdoor flush ace/king-high or lower.
import glob, json, pandas as pd, numpy as np
R = '23456789TJQKA'
d = pd.concat([pd.read_json(f, lines=True) for f in sorted(glob.glob('research/proof/out/valuesize-flop*.jsonl'))], ignore_index=True)
d['key'] = d.spot + '|' + d.seat.astype(str); d['pos'] = (d['size'] - d.low) / (d.top - d.low); d['made'] = d.tags.apply(lambda x: x[0]); d['bdf'] = d.tags.apply(lambda x: 'Backdoor flush draw' in x)
def cards(text): return [(R.index(text[i]), text[i + 1]) for i in range(0, len(text), 2)]
def run_place(row):
    if row.ways < 3: return None
    b = cards(row.board); h = cards(row.hand); br = {r for r, _ in b}; hr = {r for r, _ in h} - br; allr = br | {r for r, _ in h}
    best = None
    for lo in range(0, 11):
        run = {lo, lo + 1, lo + 2}
        if run <= allr and run & hr:
            mine = max(run & hr); place = 'top' if mine == lo + 2 else 'bottom' if mine == lo else 'middle'
            best = place if best is None or place == 'top' else best
    return best
def flush_high(row):
    if not row.bdf: return None
    b = cards(row.board); h = cards(row.hand)
    for s in 'shdc':
        mine = [r for r, x in h if x == s]; n = len(mine) + sum(1 for _, x in b if x == s)
        if n == 3 and mine:
            over = sum(1 for r in range(max(mine) + 1, 13) if (r, s) not in b)   # cards of the suit above ours that he could hold
            return 'nut or second nut' if over <= 1 else 'lower'
    return None
d['run'] = d.apply(run_place, axis=1); d['fl'] = d.apply(flush_high, axis=1)
def wavg(x, col):
    x = x[x[col].notna()]; return (x.w * x.bet * x[col]).sum() / (x.w * x.bet).sum() if len(x) and (x.w * x.bet).sum() > 0 else np.nan
print(f'flop: {len(d):,} hands, {d.key.nunique()} decisions')
out = []
tests = [('backdoor flush, nut or second nut', lambda x: (x.fl == 'nut or second nut') & (x.ways < 3)), ('backdoor flush, lower', lambda x: (x.fl == 'lower') & (x.ways < 3)),
         ('three in a row, my card on top', lambda x: (x.run == 'top') & ~x.bdf), ('three in a row, my card in the middle', lambda x: (x.run == 'middle') & ~x.bdf), ('three in a row, my card at the bottom', lambda x: (x.run == 'bottom') & ~x.bdf)]
for made in ['Top pair', 'Middle pair', 'Overpair']:
    for label, pick in tests:
        rows = []
        for key, x in d[d.made == made].groupby('key'):
            a, b = x[pick(x)], x[(~x.bdf) & (x.ways == 0)]
            if a.w.sum() < 1 or b.w.sum() < 1.5: continue
            rows.append((wavg(a[a.bet > 0.02], 'pos') - wavg(b[b.bet > 0.02], 'pos'), (1 - (a.w*a.bet).sum()/a.w.sum()) - (1 - (b.w*b.bet).sum()/b.w.sum()), (a.w*a.e).sum()/a.w.sum() - (b.w*b.e).sum()/b.w.sum()))
        r = pd.DataFrame(rows, columns=['size', 'check', 'eq'])
        if len(r) < 5: continue
        t = lambda c: (r[c].dropna().mean() / (r[c].dropna().std(ddof=1) / np.sqrt(len(r[c].dropna())))) if len(r[c].dropna()) > 2 else float('nan')
        print(f"  {made:<12} {label:<40} n {len(r):3d}   size {r['size'].mean():+.3f} (t {t('size'):+.1f})   checks {r['check'].mean():+.1%} (t {t('check'):+.1f})   equity {r['eq'].mean():+.1%}")
        out.append({'made': made, 'group': label, 'decisions': int(len(r)), 'size': round(float(r['size'].mean()), 3), 't_size': round(float(t('size')), 1), 'checks': round(float(r['check'].mean()), 3), 't_checks': round(float(t('check')), 1)})
json.dump(out, open('research/proof/out/valuesize-quality.json', 'w'))
