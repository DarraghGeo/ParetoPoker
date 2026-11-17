# The guide cut to two pages: one for a person (the two sums, the reads, the twelve tables), one for an agent building
# an engine (exact definitions and the same tables as lookups).   python3 research/butterfly/guide/onepager.py -> two-pages.html
import json, os, itertools
HERE = os.path.dirname(os.path.abspath(__file__)); R = json.load(open(os.path.join(HERE, 'data.json')))
ORDER = ['river, out of position, facing a bet', 'river, in position, facing a bet', 'turn, out of position, facing a bet', 'turn, in position, facing a bet', 'flop, out of position, facing a bet', 'flop, in position, facing a bet',
         'river, in position, first to act', 'river, out of position, first to act', 'turn, in position, first to act', 'turn, out of position, first to act', 'flop, in position, first to act', 'flop, out of position, first to act']
TITLE = {'river, out of position, facing a bet': 'River · facing a bet · either seat', 'turn, out of position, facing a bet': 'Turn · facing a bet · out of position', 'turn, in position, facing a bet': 'Turn · facing a bet · in position',
         'flop, out of position, facing a bet': 'Flop · facing a bet · out of position', 'flop, in position, facing a bet': 'Flop · facing a bet · in position', 'river, in position, first to act': 'River · checked to you · in position',
         'river, out of position, first to act': 'River · first to act · out of position', 'turn, in position, first to act': 'Turn · checked to you · in position', 'turn, out of position, first to act': 'Turn · first to act · out of position',
         'flop, in position, first to act': 'Flop · checked to you · in position', 'flop, out of position, first to act': 'Flop · first to act · out of position'}
ROWHEAD = {'margin': 'Equity vs price', 'equity': 'Equity', 'row': 'Hand'}
COLHEAD = {'draw': {'no draw': 'No draw', 'gutshot': 'Gutshot', 'open-ended': 'Open-ended', 'flush draw': 'Flush draw'}, 'stack to pot': {'under 2': 'Stack under 2 pots', '2 to 6': '2 to 6 pots', 'over 6': 'Over 6 pots'},
           'his weak hands': {'under 20% of his range': 'His weak hands: under 20%', '20-45%': '20–45%', 'over 45%': 'Over 45%'}, 'who bet last street': {'nobody': 'Flop checked through', 'I did': 'You bet the flop', 'he did': 'He bet the flop'}}
SHORT = {'5+ under the price': '5+ under', '0-5 under': '0–5 under', '0-5 over': '0–5 over', '5-15 over': '5–15 over', '15+ over': '15+ over', 'under 20%': 'Under 20%', '20-35%': '20–35%', '35-50%': '35–50%', '50-65%': '50–65%', '65-80%': '65–80%', '80%+': '80%+',
         'trips or better': 'Trips or better', 'two pair': 'Two pair', 'overpair': 'Overpair', 'top pair': 'Top pair', 'middle pair': 'Middle pair', 'low pair': 'Low pair', 'draw': 'Draw, no pair', 'air': 'Nothing'}
def filled(table):
    names = table['names']; labs = [table['labels'][n] for n in names]; got = {tuple(c['key']): c for c in table['cells']}; out = {}
    for key in itertools.product(*labs):
        if key in got: out[key] = got[key]; continue
        i = labs[0].index(key[0]); src = None
        for j in list(range(i + 1, len(labs[0]))) + list(range(i - 1, -1, -1)):
            if (labs[0][j],) + key[1:] in got: src = got[(labs[0][j],) + key[1:]]; break
        out[key] = dict(call=(src['lean'] if src['call'] == 'either' else src['call']) if src else 'no', lean=src['lean'] if src else 'no')
    return names, labs, out
def word(c, facing, either=True):
    call = c['call'] if either or c['call'] != 'either' else c['lean']
    return {'act': 'Call' if facing else 'Bet', 'no': 'Fold' if facing else 'Check', 'either': 'Either'}[call]
def grid(nm):
    v = R[nm]; facing = 'facing' in nm; names, labs, cells = filled(v['table']); sc = v['table']['score']
    h = f'<div class="t"><h3>{TITLE[nm]}</h3><table>'
    td = lambda c: f'<td class="{ {"act": "y", "no": "n", "either": "e"}[c["call"]] }">{word(c, facing)}</td>'
    if len(names) == 1:
        for a in reversed(labs[0]): h += f'<tr><th>{SHORT[a]}</th>{td(cells[(a,)])}</tr>'
        h = h.replace('<table>', f'<table><tr><th>{ROWHEAD[names[0]]}</th><th></th></tr>', 1)
    else:
        h += f'<tr><th>{ROWHEAD[names[0]]}</th>' + ''.join(f'<th>{COLHEAD[names[1]][b]}</th>' for b in labs[1]) + '</tr>'
        for a in reversed(labs[0]): h += f'<tr><th>{SHORT[a]}</th>' + ''.join(td(cells[(a, b)]) for b in labs[1]) + '</tr>'
    return h + f'</table><p class="loss">Loses {sc["mean"]:.2f}% of the pot per decision</p></div>'
def lookup(k, nm):
    facing = 'facing' in nm; names, labs, cells = filled(R[nm]['table']); L = {'Bet': 'B', 'Call': 'C', 'Check': 'x', 'Fold': 'f'}; sc = R[nm]['table']['score']
    head = f'<b>{k}. {nm}</b> [{" × ".join(names)}] loss {sc["mean"]:.2f}'
    if len(names) == 1: body = '  '.join(f'{a}:{L[word(cells[(a,)], facing, False)]}' for a in labs[0])
    else: body = f'columns = {names[1]}: ' + ' / '.join(labs[1]) + '\n' + '\n'.join(f'{a:<19}' + ' '.join(L[word(cells[(a, b)], facing, False)] for b in labs[1]) for a in labs[0])
    return f'<div class="lk"><p>{head}</p><pre>{body}</pre></div>'
shown = [nm for nm in ORDER if nm != 'river, in position, facing a bet' and nm != 'flop, out of position, first to act']
PAGE = open(os.path.join(HERE, 'two-pages-text.html')).read()
PAGE = PAGE.replace('{{FACING}}', ''.join(grid(nm) for nm in shown if 'facing' in nm)).replace('{{FIRST}}', ''.join(grid(nm) for nm in shown if 'first' in nm)).replace('{{LOOKUPS}}', ''.join(lookup(k, nm) for k, nm in enumerate(ORDER, 1)))
PAGE = PAGE.replace('{{FLOP_OOP}}', f'{R["flop, out of position, first to act"]["table"]["score"]["mean"]:.2f}').replace('{{N}}', str(sum(v['n'] for v in R.values())))
open(os.path.join(HERE, 'two-pages.html'), 'w').write(PAGE); print('written')
