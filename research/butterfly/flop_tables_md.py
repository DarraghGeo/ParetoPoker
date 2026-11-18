# The solved flop tables written out for reading: one grid per seat, pot type and table.
#   STORE=<dir> python3 research/butterfly/flop_tables_md.py [run, e.g. n24-pot-bal-k4m5] -> flop-tables.md, flop-tables.json
import json, os, sys
import numpy as np
STORE = os.environ['STORE']; RUN = sys.argv[1] if len(sys.argv) > 1 else 'n24-pot-bal-k4m5'; HERE = os.path.dirname(os.path.abspath(__file__)); L = []
PLACE = ['bottom 15%', '15-35%', '35-55%', '55-75%', '75-90%', 'top 10%']; TOP = ['<15%', '15-40%', '>40%']; DEPTH = ['<1.5 pots', '1.5-4 pots', '>4 pots']; POT = ['3-bet pot', 'single-raised pot']; SEAT = ['Out of position', 'In position']
STREET = dict(F='Flop', T='Turn', R='River'); ACTS = {'first': ['check', 'bet'], 'facing a bet': ['fold', 'call', 'raise'], 'facing a raise': ['fold', 'call']}
tabs = [json.load(open(os.path.join(STORE, f'flop-{h}-{RUN}.json')))['tables'] for h in (0, 1)]; out = {}
L += ['# Flop-to-river tables: place in range x equity against his strongest third x stack depth, by pot type', '',
      'Solved against a best-responding opponent on 24 flops (12 single-raised BB v BU/CO/UTG, 12 3-bet SB v BU), 100bb. On 20 unseen flops an opponent who knows the tables wins 10.9% of the pot against the out-of-position tables and 8.5% against the in-position ones.', '',
      '## The game they were solved in', '',
      '- One bet size a street: 33% of the pot on the flop, 75% on the turn, 75% on the river. One raise a street, to 3x the bet. A bet or raise larger than the stack is all-in.',
      '- Each flop was played on a sample of 4 turn cards with 5 river cards each.', '',
      '## How a cell is found', '',
      '- **Seat**: out of position acts first on every street.',
      '- **Pot type**: single-raised if the stacks behind are more than 8 times the pot as the flop starts, else 3-bet.',
      '- **Table**: the street, and first to act (nothing to call, including after a check) / facing a bet / facing a raise.',
      '- **Place** (rows): where the hand ranks by equity among the hands the player still holds at this decision, weighted by how often each is held: bottom 15%, 15-35%, 35-55%, 55-75%, 75-90%, top 10%. Equity is on the current board against the other player\'s range as the flop started.',
      '- **Against his best** (rows): the hand\'s equity on the current board against the strongest third of the other player\'s starting range (the third with the most equity on this board): under 15%, 15-40%, over 40%.',
      '- **Depth** (columns): stacks behind divided by the pot, both as they stand at this decision: under 1.5, 1.5 to 4, over 4.', '',
      '## How a cell reads', '',
      '- Percentages of the time each answer is taken, in the order named in the table\'s heading.',
      '- Facing a bet with no raise possible (the bet is all-in): add the raise share to call.',
      '- A dash: the cell was never reached while solving, so it has no answer. Depth columns never reached are left out.', '']
for h in (0, 1):
    for pot in (1, 0):
        L += [f'## {SEAT[h]}, {POT[pot]}', '']
        for kd, rows in tabs[h].items():
            t = np.array(rows); a = t.shape[1]; acts = ACTS[kd[2:]]; g = t.reshape(6, 3, 3, 2, a)[:, :, :, pot]; seen = np.abs(g - 1 / a).max(-1) > 1e-9; cols = [d for d in range(3) if seen[:, :, d].any()]
            if not cols: continue
            L += [f'### {STREET[kd[0]]}, {kd[2:]} ({" / ".join(acts)})', '', '| Place | Against his best | ' + ' | '.join(DEPTH[d] for d in cols) + ' |', '|---|---|' + '---|' * len(cols)]
            for p in range(5, -1, -1):
                for q in range(2, -1, -1):
                    if not seen[p, q].any(): continue
                    cells = []
                    for d in cols:
                        if not seen[p, q, d]: cells.append('-'); continue
                        v = np.round(100 * g[p, q, d]).astype(int); v[v.argmax()] += 100 - v.sum(); cells.append(' / '.join(str(int(x)) for x in v)); out.setdefault(SEAT[h], {}).setdefault(POT[pot], {}).setdefault(f'{STREET[kd[0]]}, {kd[2:]}', []).append(dict(place=PLACE[p], against_his_best=TOP[q], depth=DEPTH[d], **{n: int(x) for n, x in zip(acts, v)}))
                    L.append(f'| {PLACE[p]} | {TOP[q]} | ' + ' | '.join(cells) + ' |')
            L.append('')
open(os.path.join(HERE, 'flop-tables.md'), 'w').write('\n'.join(L)); json.dump(out, open(os.path.join(HERE, 'flop-tables.json'), 'w'), indent=0)
print(len(L), 'lines;', sum(len(c) for s in out.values() for p in s.values() for c in p.values()), 'cells with an answer')
