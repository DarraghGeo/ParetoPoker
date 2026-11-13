"""Step 1 and 2: value or bluff, and must / can't / optional, for every kind of decision."""
import sys, numpy as np, pandas as pd
sys.path.insert(0, 'diagnosis')
from hands_load import load, wmean, TAU
sets = sys.argv[1:]
df = load(*sets)
print(f"sets {sets}: {df.did.nunique()} decisions, {len(df)} hands; a mistake = an action costing over {TAU:.1%} of the pot\n")
df['band'] = pd.cut(df['rank'], [0, .1, .2, .3, .4, .5, .6, .7, .8, .9, 1.0001], labels=[f'{i*10}-{i*10+10}' for i in range(10)], right=False)
for (street, kind, position), g in df.groupby(['street', 'kind', 'position']):
    W = g.w.sum()
    print(f"== {street} {kind} {position}: {g.did.nunique()} decisions; range bets/raises {wmean(g.pAgg, g.w):.2f}, calls {wmean(g.pCall, g.w):.2f}")
    def shares(col):
        return ' '.join(f"{k} {g.w[g[col] == k].sum() / W:.2f}" for k in ('must', 'optional', 'cant'))
    if (g.aggStatus != 'none').any(): print(f"   bet/raise:  {shares('aggStatus')}")
    if kind != 'open': print(f"   continue:   {shares('contStatus')}")
    # how the solver plays the optional hands, and how pure it is
    pure = g.w[(g.pAgg > .95) | (g.pAgg < .05)].sum() / W
    print(f"   hands the solver plays pure for bet/raise (over 95% or under 5%): {pure:.2f}")
    print("   by equity rank within the range (weakest first): share that must / may / can't bet-or-raise | solver's frequency | cost of the wrong action for a must (share of pot)")
    for b, x in g.groupby('band', observed=True):
        w = x.w.sum()
        m = x[x.aggStatus == 'must']; c = x[x.aggStatus == 'cant']
        line = f"     {b:>6}%  must {m.w.sum()/w:.2f} opt {x.w[x.aggStatus=='optional'].sum()/w:.2f} cant {c.w.sum()/w:.2f} | agg {wmean(x.pAgg, x.w):.2f}"
        if kind != 'open':
            line += f" call {wmean(x.pCall, x.w):.2f} | continue: must {x.w[x.contStatus=='must'].sum()/w:.2f} opt {x.w[x.contStatus=='optional'].sum()/w:.2f} cant {x.w[x.contStatus=='cant'].sum()/w:.2f}"
        if len(m): line += f" | must-cost {wmean(m[['gPassive','gCall']].min(axis=1), m.w):.3f}"
        print(line)
    print()
