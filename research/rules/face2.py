# The raise threshold facing a bet, by street and size: cost at each threshold, continuing at the street's price rule.
import numpy as np, collections
from load import wmean
import face
for st, extra in ((4, 0.1), (5, 0.0)):
    for sz, nm in enumerate(['small', 'medium', 'big']):
        H = [d for d in face.D if d['street'] == st and d['what'] == 'facingBet' and int(np.digitize(d['faced'], [0.5, 1.0])) == sz and any(k in ('raise', 'allin') for k in d['kinds'])]
        if len(H) < 10: continue
        print(f'{face.names[st]} facing a {nm} bet (n {len(H)}), raise from: ' + '  '.join(f'{100*r:.0f}:{wmean(H, lambda d: face.cost(d, extra, r)):.2f}' for r in face.RS))
