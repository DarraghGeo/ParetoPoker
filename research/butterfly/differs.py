import os, json
# How much of the play that differs from the solver's costs anything: the difference split by what the table's play loses on that hand.
#   STORE=<dir> python3 research/butterfly/differs.py
HERE = os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(HERE, 'rules_hybrid.py')).read().split("out = open(os.path.join(HERE, 'rules-hybrid.md')")[0])
STREET=['flop','turn','river']
for nm,kept in KEPT.items():
    s=STREET.index(nm.split(',')[0]); q=0 if 'out of position' in nm else 1; fi='first' in nm; m=(street==s)&(seat==q)&(first==fi); idx=np.where(m[dec])[0]
    T,l1,f1,n1,wt,size=hybrid(kept['hand'],kept['spot'],idx,0.5,final=True); c,_=codes(kept['names'],idx); Th=T[c]
    diff=0.5*np.abs(Th-PG[idx]).sum(1); cost=(Th*L[idx]).sum(1); ww=w[idx]; tot=(ww*diff).sum()
    cheap=(ww*diff*(cost<0.005)).sum()/tot; mid=(ww*diff*((cost>=0.005)&(cost<0.02))).sum()/tot; dear=(ww*diff*(cost>=0.02)).sum()/tot
    # how much of the solver's own play is on hands that are near-indifferent (second-best answer within 0.5% pot)
    srt=np.sort(L[idx],1); tie=(srt[:,1]-srt[:,0])<0.005
    print(f"{nm:<40} differs {100*tot/ww.sum():4.0f} pts: on hands where the table's play costs <0.5% pot {100*cheap:3.0f}% | 0.5-2% {100*mid:3.0f}% | 2%+ {100*dear:3.0f}%   (hands with two answers within 0.5%: {100*(ww*tie).sum()/ww.sum():.0f}% of range)")
