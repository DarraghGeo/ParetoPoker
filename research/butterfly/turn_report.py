# The turn tests read together: every version of the tables on the 16 turn spots not solved on, and how the unrestricted
# solve plays inside our cells (which kinds of hand a cell is hiding).   STORE=<dir> python3 research/butterfly/turn_report.py
import json, os, glob, re
import numpy as np
STORE = os.environ['STORE']; base = json.load(open(os.path.join(STORE, 'turn-base.json'))); HERE = os.path.dirname(os.path.abspath(__file__)); L = []
def say(x=''): L.append(x); print(x)
NAMES = {'plain': 'ranges as the turn starts', 'spr': 'ranges as the turn starts + stack depth', 'true': 'the range held', 'true+spr': 'the range held + stack depth', 'true+spr+draw': 'the range held + stack depth + draw (three kinds, turn tables)',
         'true+spr-b20': 'the range held + stack depth, twenty bands of five points', 'true+spr+vs': 'the range held + stack depth, equity against a sound opponent\'s range', 'true+spr-d5': 'the range held + five depth bands',
         'true+spr-n60': 'the range held + stack depth, solved on 60 spots'}
say('# The turn tests together\n'); say('Exploitability on the 16 turn spots not solved on, percent of the pot as the turn starts. Turn and river solved together, one bet size and one raise a street.\n')
say('| tables | OOP: mean | median | worst | IP: mean | median | worst | both seats |'); say('|---|---|---|---|---|---|---|---|'); found = {}
for f in sorted(glob.glob(os.path.join(STORE, 'turn-[01]-*.json'))):
    m = re.match(r'turn-([01])-(.+)\.json', os.path.basename(f))
    if m and 'test' not in m.group(2): found.setdefault(m.group(2), {})[int(m.group(1))] = json.load(open(f))
for v, d in sorted(found.items(), key=lambda kv: np.mean([np.mean([r['scored'][k] - base[k][h] for k in r['scored']]) for h, r in kv[1].items()]), reverse=True):
    cells = []; means = []
    for h in (0, 1):
        if h not in d: cells += ['-', '-', '-']; continue
        ex = np.array([d[h]['scored'][k] - base[k][h] for k in d[h]['scored']]); cells += [f'{ex.mean():.1f}', f'{np.median(ex):.1f}', f'{ex.max():.1f}']; means.append(ex.mean())
    say(f"| {NAMES.get(v, v)} | " + ' | '.join(cells) + f" | {np.mean(means):.1f} |")
f = os.path.join(STORE, 'turn-profile.json')
if os.path.exists(f):
    P = json.load(open(f)); say(f'\n## Inside our cells: how the unrestricted solve plays the kinds of hand a cell holds ({len(P)} turn spots)\n')
    ANS = {'T first': ['check', 'bet'], 'T facing a bet': ['fold', 'call', 'raise'], 'T facing a raise': ['fold', 'call'], 'R first': ['check', 'bet'], 'R facing a bet': ['fold', 'call', 'raise'], 'R facing a raise': ['fold', 'call']}
    PLACE = ['bottom 15%', '15-35%', '35-55%', '55-75%', '75-90%', 'top 10%']; DRAW = ['no draw', 'gutshot', 'flush draw or 8+ cards']; MADE = ['high card', 'pair', 'two pair', 'trips', 'straight', 'flush', 'full house+']
    rows = []                                                          # (spot, seat, kind, cell, group, weight, probs)
    for sname, sp in P.items():
        for h in (0, 1):
            for key, v in sp['cells'][h].items(): kd, cell, grp = key.split('|'); rows.append((sname, h, kd, int(cell), int(grp), v[0], np.array(v[1:]) / v[0]))
    def spread(kd, split):
        """Of the differences in play between hands of one cell, how much each way of splitting the cell would take away (weighted variance of the first answer's share)."""
        R = [r for r in rows if r[2] == kd]; tot = sum(r[5] for r in R)
        def var(keyf):
            g = {}
            for r in R: k = keyf(r); a = g.setdefault(k, [0.0, 0.0]); a[0] += r[5]; a[1] += r[5] * r[6][0]
            return sum(r[5] * (r[6][0] - g[keyf(r)][1] / g[keyf(r)][0]) ** 2 for r in R) / tot
        return var(lambda r: (r[1], r[3])), var(split)
    say('How much of the play inside a cell differs from hand to hand, and how much of that difference each further split would explain (share of the variance of the first answer: check or fold):\n')
    say('| table | spread inside the cells (std, points) | explained by: the draw kind | the made hand | the board (each spot its own table) |'); say('|---|---|---|---|---|')
    for kd in ANS:
        v0, vd = spread(kd, lambda r: (r[1], r[3], r[4] // 10 if kd[0] == 'T' else 0)); _, vm = spread(kd, lambda r: (r[1], r[3], r[4] % 10)); _, vs = spread(kd, lambda r: (r[1], r[3], r[0]))
        say(f"| {kd} | {100 * np.sqrt(v0):.0f} | {('%.0f%%' % (100 * (1 - vd / v0))) if kd[0] == 'T' else '-'} | {100 * (1 - vm / v0):.0f}% | {100 * (1 - vs / v0):.0f}% |")
    for kd, a in (('T first', 1), ('T facing a bet', 0)):
        say(f"\n**{kd}: share that {'bets' if a == 1 else 'folds'}, by the hand's place in the range and its draw** (all spots, both seats)\n"); say('| place | ' + ' | '.join(DRAW) + ' |'); say('|---|---|---|---|')
        for pb in range(5, -1, -1):
            out = []
            for dk in range(3):
                R = [r for r in rows if r[2] == kd and r[3] // 9 == pb and r[4] // 10 == dk]; wt = sum(r[5] for r in R); out.append(f"{100 * sum(r[5] * r[6][a] for r in R) / wt:.0f}% ({100 * wt / max(sum(r[5] for r in rows if r[2] == kd), 1e-9):.0f})" if wt > 0 else '-')
            say(f'| {PLACE[pb]} | ' + ' | '.join(out) + ' |')
    for kd, a in (('T first', 1), ('R first', 1), ('R facing a bet', 0)):
        say(f"\n**{kd}: share that {'bets' if a == 1 else 'folds'}, by place and made hand**\n"); say('| place | ' + ' | '.join(MADE) + ' |'); say('|---|' + '---|' * len(MADE))
        for pb in range(5, -1, -1):
            out = []
            for mk in range(7):
                R = [r for r in rows if r[2] == kd and r[3] // 9 == pb and r[4] % 10 == mk]; wt = sum(r[5] for r in R); allw = sum(r[5] for r in rows if r[2] == kd and r[3] // 9 == pb)
                out.append(f"{100 * sum(r[5] * r[6][a] for r in R) / wt:.0f}% ({100 * wt / allw:.0f})" if wt > 0.002 * allw else '-')
            say(f'| {PLACE[pb]} | ' + ' | '.join(out) + ' |')
    say('\nIn brackets: the share of that table (or of that place) the group makes up.')
open(os.path.join(HERE, 'turn-report.md'), 'w').write('\n'.join(L) + '\n')
