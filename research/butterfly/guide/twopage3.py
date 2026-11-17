# The two pages rebuilt on the three-answer tables (rules3.json: solves with raises on every street).
#   python3 research/butterfly/guide/twopage3.py -> two-pages.html   (node print.cjs two makes the PDF)
import json, os, itertools
HERE = os.path.dirname(os.path.abspath(__file__)); R = json.load(open(os.path.join(HERE, '..', 'rules-hybrid.json')))
for v in R.values(): v['score'] = dict(mean=v['scores']['0.5']['ev'], p90=v['scores']['0.5']['ev90'], differs=v['scores']['0.5']['differs'])
ORDER = ['river, out of position, facing a bet', 'river, in position, facing a bet', 'turn, out of position, facing a bet', 'turn, in position, facing a bet', 'flop, out of position, facing a bet', 'flop, in position, facing a bet',
         'river, in position, first to act', 'river, out of position, first to act', 'turn, in position, first to act', 'turn, out of position, first to act', 'flop, in position, first to act', 'flop, out of position, first to act']
TITLE = {'river, out of position, facing a bet': 'River · facing a bet · either seat', 'turn, out of position, facing a bet': 'Turn · facing a bet · out of position', 'turn, in position, facing a bet': 'Turn · facing a bet · in position',
         'flop, out of position, facing a bet': 'Flop · facing a bet · out of position', 'flop, in position, facing a bet': 'Flop · facing a bet · in position', 'river, in position, first to act': 'River · checked to you · in position',
         'river, out of position, first to act': 'River · first to act · out of position', 'turn, in position, first to act': 'Turn · checked to you · in position', 'turn, out of position, first to act': 'Turn · first to act · out of position',
         'flop, in position, first to act': 'Flop · checked to you · in position', 'flop, out of position, first to act': 'Flop · first to act · out of position'}
ROWHEAD = {'margin': 'Equity vs price', 'equity': 'Equity', 'row': 'Hand'}
COLHEAD = {'draw': {'no draw': 'None', 'gutshot': 'Gutshot', 'open-ended': 'Open', 'flush draw': 'Flush'}, 'his weak hands': {'under 20%': '&lt;20%', '20-45%': '20–45%', 'over 45%': '&gt;45%'},
           'range equity': {'under 45%': '&lt;45%', '45-55%': '45–55%', 'over 55%': '&gt;55%'}, 'stack to pot': {'under 2': '&lt;2', '2 to 6': '2–6', 'over 6': '&gt;6'},
           'who bet last street': {'nobody': 'Checked', 'I did': 'You bet', 'he did': 'He bet'}}
COLTITLE = {'draw': 'Your draw', 'his weak hands': 'His weak hands', 'range equity': 'Your range equity', 'stack to pot': 'Stack, in pots', 'who bet last street': 'The street before'}
SHORT = {'5+ under the price': '5+ under', '0-5 under': '0–5 under', '0-5 over': '0–5 over', '5-15 over': '5–15 over', '15-30 over': '15–30 over', '30+ over': '30+ over', 'under 20%': 'Under 20%', '20-35%': '20–35%', '35-50%': '35–50%', '50-65%': '50–65%', '65-80%': '65–80%', '80%+': '80%+',
         'trips or better': 'Trips or better', 'two pair': 'Two pair', 'overpair': 'Overpair', 'top pair': 'Top pair', 'middle pair': 'Middle pair', 'low pair': 'Low pair', 'draw': 'Draw, no pair', 'air': 'Nothing'}
WORD = {'fold': 'Fold', 'call': 'Call', 'raise': 'Raise', 'check': 'Check', 'bet': 'Bet', 'bet big': 'Bet big'}; CLS = {'fold': 'n', 'check': 'n', 'call': 'y', 'bet': 'y', 'raise': 'r', 'bet big': 'r'}
def filled(t):
    """The table by cell, each with how often to give each answer, in quarters. A cell with under 0.3% of the range (or none) takes the next band up in its column."""
    names = t['names']; labs = [t['labels'][n] for n in names]; got = {tuple(c['key']): c for c in t['cells'] if c['share'] >= 0.003}; out = {}
    for key in itertools.product(*labs):
        if key in got: out[key] = got[key]; continue
        i = labs[0].index(key[0]); src = None
        for j in list(range(i + 1, len(labs[0]))) + list(range(i - 1, -1, -1)):
            if (labs[0][j],) + key[1:] in got: src = got[(labs[0][j],) + key[1:]]; break
        out[key] = dict(quarters=src['quarters'] if src else [4, 0, 0], rare=True)
    return names, labs, out
COL = ['#BFE6DE', '#F0896B', '#15171B']                       # fold or check, call or bet, raise or bet big
def td(c, ans, sep=None):
    """A cell as solid blocks side by side, each as wide as its answer's share (separate boxes, so the edges print sharp)."""
    q = c['quarters']; title = ', '.join(f'{WORD[ans[k]]} {25 * q[k]}%' for k in range(3) if q[k])
    return f'<td class="bar" title="{title}"><div>' + ''.join(f'<span style="background:{COL[k]};flex:{q[k]} 0 0"></span>' for k in range(3) if q[k]) + '</div></td>'
def grid(nm, title=None, loss=None):
    t = R[nm]; names, labs, cells = filled(t)
    h = f'<div class="t"><h3>{title or TITLE[nm]}</h3><table>'
    if len(names) == 1:
        h += f'<tr><th class="rh">{ROWHEAD[names[0]]}</th><th></th></tr>' + ''.join(f'<tr><th class="rh">{SHORT[a]}</th>{td(cells[(a,)], t['answers'], ' · ')}</tr>' for a in reversed(labs[0]))
    else:
        h += f'<tr><th class="rh" rowspan="2">{ROWHEAD[names[0]]}</th><th class="grp" colspan="{len(labs[1])}">{COLTITLE[names[1]]}</th></tr><tr>' + ''.join(f'<th>{COLHEAD[names[1]][b]}</th>' for b in labs[1]) + '</tr>' + ''.join(f'<tr><th class="rh">{SHORT[a]}</th>' + ''.join(td(cells[(a, b)], t['answers']) for b in labs[1]) + '</tr>' for a in reversed(labs[0]))
    return h + f'</table><p class="loss">{loss or f"Loses {t['score']['mean']:.2f}% of the pot per decision"}</p></div>'
def lookup(k, nm):
    t = R[nm]; names, labs, cells = filled(t); head = f'<b>{k}. {nm}</b> [{" × ".join(names)}] loss {t["score"]["mean"]:.2f} (P90 {t["score"]["p90"]:.2f})'; code = lambda c: ''.join(str(x) for x in c['quarters'])
    if len(names) == 1: body = '  '.join(f'{a}:{code(cells[(a,)])}' for a in labs[0])
    else: body = f'columns = {names[1]}: ' + ' / '.join(labs[1]) + '\n' + '\n'.join(f'{a:<19}' + ' '.join(code(cells[(a, b)]) for b in labs[1]) for a in labs[0])
    return f'<div class="lk"><p>{head}</p><pre>{body}</pre></div>'
ro, ri = R['river, out of position, facing a bet']['score']['mean'], R['river, in position, facing a bet']['score']['mean']
facing = grid('river, out of position, facing a bet', loss=f'Loses {ro:.2f}% of the pot per decision out of position, {ri:.2f}% in position') + ''.join(grid(nm) for nm in ORDER[2:6])
first = ''.join(grid(nm) for nm in ORDER[6:])
PAGE = open(os.path.join(HERE, 'two-pages-text3.html')).read()
PAGE = PAGE.replace('{{FACING}}', facing).replace('{{FIRST}}', first).replace('{{LOOKUPS}}', ''.join(lookup(k, nm) for k, nm in enumerate(ORDER, 1)))
PAGE = PAGE.replace('{{TURN_OOP}}', f'{R["turn, out of position, first to act"]["score"]["mean"]:.2f}').replace('{{N}}', f'{sum(v["n"] for v in R.values()):,}')
open(os.path.join(HERE, 'two-pages.html'), 'w').write(PAGE); print('written')
