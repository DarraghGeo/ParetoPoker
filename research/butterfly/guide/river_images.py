# The solved shared river tables as pictures: one page a seat and table shape, each cell solid colours side by side,
# as wide as each answer's share (in 10% steps).   python3 research/butterfly/guide/river_images.py -> river-*.html
import json, os
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); J = json.load(open(os.path.join(HERE, '..', 'restricted-river-tables.json'))); KINDS = J['kinds']
PLACE = ['Bottom 15%', '15–35%', '35–55%', '55–75%', '75–90%', 'Top 10%']; EQ3 = ['<35%', '35–65%', '>65%']; WEAK = ['<30%', '30–50%', '>50%']
COL = {'check': '#BFE6DE', 'fold': '#BFE6DE', 'bet 33%': '#F9CDBD', 'bet 75%': '#F0896B', 'call': '#F0896B', 'bet 150% or all-in': '#15171B', 'raise': '#15171B'}
TITLE = {'first': 'First to act, or checked to', 'facing a small bet': 'Facing a small bet (up to half the pot)', 'facing a bet': 'Facing a bet (half the pot to the pot)', 'facing a big bet': 'Facing a big bet (over the pot)', 'facing a raise': 'Facing a raise'}
def tenths(fr):
    fr = np.array(fr); x = fr * 10; lo = np.floor(x + 1e-9); left = (10 - lo.sum(1)).astype(int); order = np.argsort(-(x - lo), axis=1)
    for k in range(fr.shape[1]): lo[np.arange(len(lo)), order[:, k]] += (left > k)
    return lo.astype(int)
def cell(q, ans): return '<td class="bar"><div>' + ''.join(f'<span style="background:{COL[a]};flex:{v} 0 0"></span>' for a, v in zip(ans, q) if v) + '</div></td>'
def page(key, seat, rows, cols, coltitle, scores):
    tabs = J['tables'][f'{key}|{seat}']; h = f'<h1>River · {"in position" if seat else "out of position"}</h1><p class="sub">{scores}</p>'
    for grp, kinds in (('first', ['first']), ('facing', ['facing a small bet', 'facing a bet', 'facing a big bet', 'facing a raise'])):
        ans = KINDS[kinds[0]]; h += '<p class="key">' + ''.join(f'<b style="background:{COL[a]}"></b>{a.capitalize()}' for a in ans) + '</p><div class="grid">'
        for kd in kinds:
            t = tenths(tabs[kd]); nc = len(cols); h += f'<div class="t"><h3>{TITLE[kd]}</h3><table><tr><th class="rh" rowspan="2">Your hand\'s place<br>in your range</th><th class="grp" colspan="{nc}">{coltitle}</th></tr><tr>' + ''.join(f'<th>{c}</th>' for c in cols) + '</tr>'
            for r in range(len(rows) - 1, -1, -1): h += f'<tr><th class="rh">{rows[r]}</th>' + ''.join(cell(t[r * nc + c], KINDS[kd]) for c in range(nc)) + '</tr>'
            h += '</table></div>'
        h += '</div>'
    return h
CSS = '''body{font-family:Inter,system-ui,sans-serif;color:#15171B;background:#FAFAF7;margin:0;padding:22px 24px;width:820px}h1{font-size:25px;margin:0 0 4px;letter-spacing:-.02em}
.sub{color:#4F535B;font-size:14px;margin:0 0 6px;line-height:1.4}h3{font-size:14px;margin:0 0 5px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px 22px;margin-bottom:8px}
.key{font-size:13px;color:#4F535B;margin:14px 0 8px}.key b{display:inline-block;width:14px;height:11px;border-radius:2px;vertical-align:-1px;margin:0 5px 0 12px}.key b:first-child{margin-left:0}
table{border-collapse:collapse;width:100%;table-layout:fixed}th{font-weight:500;font-size:11.5px;color:#4F535B;padding:2px 3px;text-align:center}th.rh{text-align:left;color:#15171B;width:104px;font-size:12px;line-height:1.2}th.grp{font-weight:600;color:#15171B}
td.bar{padding:0;border:1.5px solid #FAFAF7}td.bar div{display:flex;height:19px}td.bar span{display:block}'''
for key, name, rows, cols, ct in (('place|my weak hands', 'weak', PLACE, WEAK, 'Your weak hands (under 30% equity)'),):
    for seat in (0, 1):
        sc = SCORES.get(f'{key}|{seat}', '') if (SCORES := json.load(open(os.path.join(HERE, 'river-scores.json'))) if os.path.exists(os.path.join(HERE, 'river-scores.json')) else {}) is not None else ''
        open(os.path.join(HERE, f'river-{name}-{"ip" if seat else "oop"}.html'), 'w').write(f'<!doctype html><meta charset="utf-8"><style>{CSS}</style>' + page(key, seat, rows, cols, ct, sc))
# the place-by-equity grid: rows are place, columns the hand's equity
for seat in (0, 1):
    SC = json.load(open(os.path.join(HERE, 'river-scores.json'))) if os.path.exists(os.path.join(HERE, 'river-scores.json')) else {}
    open(os.path.join(HERE, f'river-grid-{"ip" if seat else "oop"}.html'), 'w').write(f'<!doctype html><meta charset="utf-8"><style>{CSS}</style>' + page('place x equity|None', seat, PLACE, EQ3, 'Equity against his range', SC.get(f'place x equity|None|{seat}', '')))
print('written')
