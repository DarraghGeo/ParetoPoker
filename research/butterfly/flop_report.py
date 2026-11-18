# The flop runs read together: every version of the shared tables on the scoring flops, each flop solved alone, and what
# about a flop goes with a high figure.   STORE=<dir> K=4 M=5 python3 research/butterfly/flop_report.py -> flop-report.md
import json, os, glob, re
import numpy as np
STORE = os.environ['STORE']; TAG = f"-k{os.environ.get('K', 4)}m{os.environ.get('M', 5)}" + (('-' + os.environ['GAME']) if os.environ.get('GAME') else ''); HERE = os.path.dirname(os.path.abspath(__file__)); base = {}; [base.update(json.load(open(g))) for g in glob.glob(os.path.join(STORE, f'flop-base{TAG}*.json')) if re.fullmatch(rf'flop-base{re.escape(TAG)}(-\d+of\d+)?\.json', os.path.basename(g))]; L = []; RK = '23456789TJQKA'
def say(x=''): L.append(x); print(x)
rows = {}
for t in open(os.path.join(STORE, 'flop-roots.jsonl')):
    d = json.loads(t)
    if d['spot'] not in base: continue
    b = d['board'].split(); w = np.array([h['w'] for h in d['hands']]); e = np.array([h['e'] for h in d['hands']]); vw = np.array([x[1] for x in d['vr']]); ve = np.array([x[2] for x in d['vr']]); w /= w.sum(); vw /= vw.sum(); rk = sorted(RK.index(c[0]) for c in b)
    rows[d['spot']] = dict(board=d['board'], pot=d['action'], pre=d['pre'], spr=d['behind'] / d['pot'], suits=max([c[1] for c in b].count(s) for s in 'shdc'), paired=len(set(rk)) < 3, high=rk[-1], span=rk[-1] - rk[0], eq0=float((w * e).sum()), strong=[float(w[e >= .8].sum()), float(vw[ve >= .8].sum())], weak=[float(w[e < .3].sum()), float(vw[ve < .3].sum())])
say(f'# The flop runs together ({len(base)} scoring flops with the game\'s value known)\n'); say("Exploitability over the whole hand from the flop, percent of the pot as the flop starts. " + (f"Bet sizes (flop | turn | river, shares of the pot) {os.environ['SIZES']}, up to {os.environ.get('RAISES', 1)} raises a street" if os.environ.get('SIZES') else 'One bet size and one raise a street') + f"; each flop on a sample of {os.environ.get('K', 4)} turn cards with {os.environ.get('M', 5)} river cards each.\n")
say('| shared tables | flops solved on | scoring flops | OOP: mean | median | worst | IP: mean | median | worst | both |'); say('|---|---|---|---|---|---|---|---|---|---|'); runs = {}
for f in sorted(glob.glob(os.path.join(STORE, f'flop-[01]-n*{TAG}.json'))):
    m = re.match(rf'flop-([01])-n(\d+)(.*){re.escape(TAG)}\.json', os.path.basename(f)); runs.setdefault((m.group(3).lstrip('-') or 'place, strongest third, depth', int(m.group(2))), {})[int(m.group(1))] = json.load(open(f))
for (name, n), d in sorted(runs.items(), key=lambda kv: (kv[0][0], kv[0][1])):
    cells = []; means = []; ns = 0
    for h in (0, 1):
        if h not in d: cells += ['-', '-', '-']; continue
        ex = np.array([v - base[k][h] for k, v in d[h]['scored'].items() if k in base]); ns = len(ex); cells += [f'{ex.mean():.1f}', f'{np.median(ex):.1f}', f'{ex.max():.1f}']; means.append(ex.mean())
    say(f"| {name} | {n} | {ns} | " + ' | '.join(cells) + f" | {np.mean(means):.1f} |")
alone = {}
for f in glob.glob(os.path.join(STORE, f'flop-alone{TAG}*.json')):
    if re.fullmatch(rf'flop-alone{re.escape(TAG)}(-\d+of\d+)?\.json', os.path.basename(f)): alone.update(json.load(open(f)))
best = max((k for k in runs if 0 in runs[k] and 1 in runs[k]), key=lambda k: (k[0] == 'place, strongest third, depth', k[1]), default=None)
if best:
    R = runs[best]; say(f'\n## Flop by flop (shared tables solved on {best[1]} flops: {best[0]})\n'); say('| flop | pot | stacks behind | OOP range equity | OOP | IP | alone: OOP | IP |'); say('|---|---|---|---|---|---|---|---|'); feats = []
    for k in sorted(R[0]['scored'], key=lambda k: -(R[0]['scored'][k] - base[k][0] + R[1]['scored'].get(k, 0) - base[k][1]) if k in base else 0):
        if k not in base or k not in R[1]['scored']: continue
        r = rows[k]; e0, e1 = R[0]['scored'][k] - base[k][0], R[1]['scored'][k] - base[k][1]; a = alone.get(k); say(f"| {r['board']} | {r['pre']} | {r['spr']:.1f} | {100 * r['eq0']:.0f}% | {e0:.1f} | {e1:.1f} | {('%.1f' % a[0]) if a else '-'} | {('%.1f' % a[1]) if a else '-'} |"); feats.append((r, e0, e1))
    if alone: ks = [k for k in alone if k in R[0]['scored'] and k in R[1]['scored']]; say(f"\nOn the {len(ks)} flops also solved alone: alone {np.mean([alone[k][0] for k in ks]):.1f} / {np.mean([alone[k][1] for k in ks]):.1f}, shared {np.mean([R[0]['scored'][k] - base[k][0] for k in ks]):.1f} / {np.mean([R[1]['scored'][k] - base[k][1] for k in ks]):.1f}.")
    if len(feats) >= 8:
        say('\n## What goes with a high figure\n'); say('| about the flop | correlation with OOP exploitability | with IP |'); say('|---|---|---|'); e0 = np.array([f[1] for f in feats]); e1 = np.array([f[2] for f in feats])
        for nm, fn in (('stacks behind, in pots', lambda r: r['spr']), ('out of position\'s range equity', lambda r: r['eq0']), ('OOP strong hands minus IP strong hands', lambda r: r['strong'][0] - r['strong'][1]), ('OOP share of weak hands', lambda r: r['weak'][0]), ('IP share of weak hands', lambda r: r['weak'][1]), ('two or more of a suit', lambda r: float(r['suits'] >= 2)), ('paired', lambda r: float(r['paired'])), ('highest card', lambda r: r['high']), ('gap between highest and lowest card', lambda r: r['span'])):
            x = np.array([fn(f[0]) for f in feats]); say(f"| {nm} | {np.corrcoef(x, e0)[0, 1]:+.2f} | {np.corrcoef(x, e1)[0, 1]:+.2f} |" if x.std() > 0 else f'| {nm} | - | - |')
        for nm, sel in (('single-raised pots', lambda r: r['pot'] == 'SRP'), ('3-bet pots', lambda r: r['pot'] == '3BP')):
            g = [f for f in feats if sel(f[0])]
            if g: say(f"\n{nm} ({len(g)}): {np.mean([f[1] for f in g]):.1f} / {np.mean([f[2] for f in g]):.1f}")
open(os.path.join(HERE, os.environ.get('OUT', 'flop-report.md')), 'w').write('\n'.join(L) + '\n')
