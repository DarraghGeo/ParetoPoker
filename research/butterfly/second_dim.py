# The six tables with one dimension (river facing a bet, both seats; turn first to act, both seats; flop first to act,
# both seats): what a second dimension would add, for money (EV lost) and for balance (how far the play and the overall
# frequencies are from the solver's). Candidates: the hand's row, draw, place in its row, pocket pair, blockers (whether
# its cards remove more of his strong hands or of his weak ones; a card of the flush suit), and each read of the spot.
#   STORE=<dir> python3 research/butterfly/second_dim.py   ->  research/butterfly/second-dim.md
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(HERE, 'rules_hybrid.py')).read().split("out = open(os.path.join(HERE, 'rules-hybrid.md')")[0])
blk = (Z['bhi'] - Z['blo']).astype(np.float64); flush3 = g('flush3')
HANDF['blockers'] = (band(blk, [-.05, .05]), ['removes more of his weak hands', 'neither', 'removes more of his strong hands'])
HANDF['his strong hands blocked'] = (band(Z['bhi'].astype(np.float64), [.03, .12]), ['under 3%', '3-12%', 'over 12%'])
HANDF['flush card'] = (np.where(flush3[dec], Z['fb'] + 1, 0), ['no flush possible', 'none of the suit', 'one of the suit', 'the ace of the suit'])
HANDF['pocket pair'] = (Z['pocket'].astype(int), ['no', 'yes'])
ONE = {'river, out of position, facing a bet': 'margin', 'river, in position, facing a bet': 'margin', 'turn, out of position, first to act': 'equity', 'turn, in position, first to act': 'equity',
       'flop, in position, first to act': 'equity', 'flop, out of position, first to act': 'row'}
STREET = ['flop', 'turn', 'river']; out = open(os.path.join(HERE, 'second-dim.md'), 'w')
def say(*a): print(*a); print(*a, file=out); out.flush()
say('# A second dimension for the one-dimension tables\n')
say('On flops the table was not made from. "One answer" is each cell\'s least-losing answer; "free mixes" adds any answer within 0.5% of the pot a hand, in the solver\'s proportions. "Differs" is the share of play that is not the solver\'s; "frequency miss" the distance of the overall share of the second / third answer from the solver\'s, in points.\n')
for nm, base in ONE.items():
    s = STREET.index(nm.split(',')[0]); q = 0 if 'out of position' in nm else 1; fi = 'first' in nm; m = (street == s) & (seat == q) & (first == fi); idx = np.where(m[dec])[0]
    hand2 = [h for h in ('row', 'equity', 'draw', 'half', 'pocket pair', 'blockers', 'his strong hands blocked', 'flush card') if h != base and not (h == 'draw' and s == 2) and not (h == 'equity' and base == 'margin')]
    reads = [k for k in SPOTF if (k != 'what I face' or not fi)]; rows = []
    b0, b5 = hybrid([base], [], idx, 0), hybrid([base], [], idx, 0.5)
    for h in hand2: rows.append((h, 'hand', hybrid([base, h], [], idx, 0), hybrid([base, h], [], idx, 0.5)))
    for r in reads: rows.append((r, 'spot', hybrid([base], [r], idx, 0), hybrid([base], [r], idx, 0.5)))
    say(f'\n## {nm}: {base} alone, then with a second dimension ({m.sum()} decisions)\n'); say('| second dimension | kind | cells | one answer: EV lost | free mixes: EV lost | differs | frequency miss |'); say('|---|---|---|---|---|---|---|')
    line = lambda name, kind, a, b: say(f"| {name} | {kind} | {a['cells']} | {a['ev']:.2f} | {b['ev']:.2f} | {b['differs']:.0f} | {b['miss1']:.0f} / {b['miss2']:.0f} |")
    line('**none**', '', b0, b5)
    for name, kind, a, b in sorted(rows, key=lambda r: r[3]['ev']): line(name, kind, a, b)
    # the cells of the best for money and of the best for balance
    for tag, pick in (('least EV lost', min(rows, key=lambda r: r[3]['ev'])), ('closest to the solver', min(rows, key=lambda r: r[3]['differs']))):
        name, kind = pick[0], pick[1]; hd, sp = ([base, name], []) if kind == 'hand' else ([base], [name]); T, l1, f1, n1, wt, size = hybrid(hd, sp, idx, 0.5, final=True); names = hd + sp; labels = [HANDF[x][1] if x in HANDF else SPOTF[x][1] for x in names]
        say(f'\n{tag}: {base} x {name}. Cells (share of range | check-or-fold / second / third answer, in quarters | the solver):\n')
        for code in range(size):
            if n1[code] == 0 or wt[code] / wt.sum() < 0.004: continue
            x = code; parts = []
            for lab in reversed(labels): parts.append(lab[x % len(lab)]); x //= len(lab)
            say(f"- {' / '.join(parts[::-1])}: {100 * wt[code] / wt.sum():.1f}% | {' / '.join(str(int(round(100 * v))) for v in T[code])} | {' / '.join(f'{100 * v:.0f}' for v in f1[code])}")
out.close()
