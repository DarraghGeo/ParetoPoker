"""Turn: the action by kind of hand. First to act: how often each kind bets and whether it must,
may or can't. Facing a bet: fold / call / raise by equity against the pot odds, and what
separates the hands near the line."""
import sys, numpy as np, pandas as pd
sys.path.insert(0, 'diagnosis')
from hands_load import load, wmean
df = load(*sys.argv[1:]); df = df[df.street == 'turn']
DRAW = {0: 'no draw', 1: 'gutshot', 2: 'strong draw', 3: 'nut draw'}
df['nowBand'] = pd.cut(df.rankNow, [0, .2, .4, .6, .8, .9, 1.0001], labels=['0-20', '20-40', '40-60', '60-80', '80-90', '90-100'], right=False)
print("== A. First to act, by strength now (rank in range) and draw: bet frequency | must / may / can't bet (share of the kind) | share of range")
for pos, g in df[df.kind == 'open'].groupby('position'):
    print(f" {pos}: range bets {wmean(g.pAgg, g.w):.2f}")
    for d, x in g.groupby('draw'):
        cells = []
        for b, y in x.groupby('nowBand', observed=True):
            w = y.w.sum()
            cells.append(f"{b}: {wmean(y.pAgg, y.w):.2f} [{y.w[y.aggStatus=='must'].sum()/w:.2f}/{y.w[y.aggStatus=='optional'].sum()/w:.2f}/{y.w[y.aggStatus=='cant'].sum()/w:.2f}] {w/g.w.sum():.3f}")
        print(f"   {DRAW.get(d, d):<12} " + ' | '.join(cells))
    # the size: which kinds use the biggest size when they bet
    big = g[g.nAgg > 1]
    print("   share of bets at the biggest size, by strength now: " + ' '.join(f"{b}: {(y.pBig*y.w).sum()/max(1e-9,(y.pAgg*y.w).sum()):.2f}" for b, y in big.groupby('nowBand', observed=True)))
f = df[df.kind != 'open'].copy()
f['odds'] = f.faced / (1 + 2 * f.faced); f['edge'] = f['eq'] - f.odds
eb = [-1, -.2, -.1, -.05, 0, .05, .1, .2, .4, 1]
print("\n== B. Facing a bet or raise, by equity minus pot odds: fold / call / raise | continue must / may / can't")
for (kind, pos), g in f.groupby(['kind', 'position']):
    print(f" {kind} {pos}")
    for b, x in g.assign(b=pd.cut(g.edge, eb)).groupby('b', observed=True):
        w = x.w.sum()
        print(f"    edge {str(b):>14}: share {w/g.w.sum():.2f}  fold {wmean(x.pPassive,x.w):.2f} call {wmean(x.pCall,x.w):.2f} raise {wmean(x.pAgg,x.w):.2f} | {x.w[x.contStatus=='must'].sum()/w:.2f}/{x.w[x.contStatus=='optional'].sum()/w:.2f}/{x.w[x.contStatus=='cant'].sum()/w:.2f}")
    near = g[(g.edge > -0.1) & (g.edge <= 0.05)]
    print("    the hands near the line (edge -10% to +5%): continue by ...")
    print("       draw class: " + ' | '.join(f"{DRAW.get(d, d)} {wmean(x.pCont, x.w):.2f} ({x.w.sum()/near.w.sum():.2f})" for d, x in near.groupby('draw')))
    for c, label in (('implied', 'implied odds'), ('best', 'best card'), ('drawEq', 'draw equity'), ('now', 'strength now'), ('swing', 'swing'), ('blockEdge', 'blocks his best over his worst'), ('spread', 'spread')):
        q = pd.qcut(near[c].rank(method='first'), 4, labels=False)
        print(f"       {label:<30} by quarters, lowest first: " + ' '.join(f"{wmean(x.pCont, x.w):.2f}" for _, x in near.groupby(q)))
    # raises: which hands raise
    r = g[g.gAgg.notna()]
    if len(r):
        print("    raising, by equity rank: " + ' '.join(f"{wmean(x.pAgg, x.w):.2f}" for _, x in r.groupby(pd.cut(r['rank'], [0, .2, .4, .6, .8, .9, 1.0001], right=False), observed=True)) + "   and by draw: " + ' | '.join(f"{DRAW.get(d, d)} {wmean(x.pAgg, x.w):.2f}" for d, x in r.groupby('draw')))
