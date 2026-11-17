# The two pages' river tables on the same river spots as restricted.py: what the best reply wins from them, beside the
# restricted solve's floor for six equity bands. The tables read the other player's range as he plays at equilibrium.
#   python3 research/butterfly/restricted_page.py [spots] [rounds]
import os, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
exec(open(os.path.join(HERE, 'restricted.py')).read().split("if __name__ == '__main__':")[0])
TAB = json.load(open(os.path.join(HERE, 'rules-final.json'))); band = lambda x, e: int(np.digitize(x, e))
def page_strategy(spot, hero, eq):
    """The river tables for `hero`, each decision read against the other's range there under equilibrium play."""
    opp = 1 - hero; sig = {}
    def go(k, r_opp):
        node = spot.nodes[k]
        if not isinstance(node[0], int): return
        p, acts, inv = node
        if p == opp:
            for a, (_, c) in enumerate(acts): go(c, r_opp * eq[opp][k][:, a])
            return
        M = (lambda X: X @ r_opp) if hero == 0 else (lambda X: X.T @ r_opp); win = spot.W if hero == 0 else spot.L; den = M(spot.V); e = (M(win) + 0.5 * M(spot.T)) / np.maximum(den, 1e-12)
        Mo = (lambda X: X.T @ spot.w[hero]) if hero == 0 else (lambda X: X @ spot.w[hero]); lose = spot.L if hero == 0 else spot.W; eo = (Mo(lose) + 0.5 * Mo(spot.T)) / np.maximum(Mo(spot.V), 1e-12)
        his_weak = r_opp[eo < .3].sum() / max(r_opp.sum(), 1e-12); my_eq = (spot.w[hero] * e * (den > 0)).sum() / max((spot.w[hero] * (den > 0)).sum(), 1e-12); to_call = inv[opp] - inv[hero]; first = to_call <= 0
        t = TAB[f"river, {'in position' if hero else 'out of position'}, {'first to act' if first else 'facing a bet'}"]; names = [a for a, _ in acts]; pot = spot.P0 + inv[0] + inv[1]; price = 0 if first else to_call / (pot + to_call)
        if first: e0 = names.index('check'); e1 = next((i for i, n in enumerate(names) if n == 'bet 75%'), len(names) - 1); e2 = next((i for i, n in enumerate(names) if n == 'bet 150%'), len(names) - 1)
        else: e0 = names.index('fold'); e1 = names.index('call'); e2 = next((i for i, n in enumerate(names) if n in ('raise', 'allin')), e1)
        s = np.zeros((len(e), len(acts)))
        for i in range(len(e)):
            key = []
            for n_, labs in zip(t['names'], t['labels']):
                key.append(labs[band(e[i], [.2, .35, .5, .65, .8])] if n_ == 'equity' else labs[band(e[i] - price, [-.05, 0, .05, .15, .3])] if n_ == 'margin' else labs[band(his_weak, [.2, .45])] if n_ == 'his weak hands' else labs[band(my_eq, [.45, .55])])
            q = t['cells']['|'.join(key)]; s[i, e0] += q[0] / 4; s[i, e1] += q[1] / 4; s[i, e2] += q[2] / 4
        sig[k] = s
        for a, (_, c) in enumerate(acts): go(c, r_opp)
    go(spot.root, spot.w[opp].copy()); return sig
if __name__ == '__main__':
    n_spots = int(sys.argv[1]) if len(sys.argv) > 1 else 6; rounds = int(sys.argv[2]) if len(sys.argv) > 2 else 2000; picked = []; seen = {}
    for name in ('hands-9v', 'hands-7v', 'hands-8v'):
        for text in open(os.path.join(DATA, name + '.jsonl')):
            if '|first"' not in text: continue
            d = json.loads(text)
            if len(d['board'].split()) != 5 or d['seat'] != 0 or d['toCall'] > 0 or seen.get(d['action'], 0) >= 2 or d['spot'] in [x['spot'] for x in picked] or len(d['hands']) < 100 or len(d['vr']) < 100 or not (0.8 <= d['behind'] / d['pot'] <= 8): continue
            seen[d['action']] = seen.get(d['action'], 0) + 1; picked.append(d)
    picked = picked[:n_spots]; out = open(os.path.join(HERE, 'restricted-page.md'), 'w')
    def say(*a): print(*a); print(*a, file=out); out.flush()
    say('# The two pages\' river tables against the restricted solve, on the same river spots\n'); say('What the best reply wins over the value of the game, in percent of the pot.\n')
    say('| river spot | seat | the two pages\' tables | 6 equity bands: exact | in 10% steps | in 25% steps | 10 bands of ten points: exact | in 10% steps | in 25% steps | 12 bands | every hand alike |'); say('|---|---|---|---|---|---|---|---|---|---|---|'); tot = np.zeros(9); n = 0
    for d in picked:
        spot = Spot(d); eq = equilibrium(spot, 800); base = [spot.best_reply(p, eq[p])[0] for p in (0, 1)]
        for hero in (0, 1):
            mine = [k for k in spot.dec if spot.nodes[k][0] == hero]; ex = lambda g: 100 * (g - base[hero]) / spot.P0; page = ex(spot.best_reply(hero, page_strategy(spot, hero, eq))[0]); r = {}
            for nb in (6, 10, 12, 1): r[nb] = restricted(spot, hero, {k: (np.zeros(len(spot.w[hero]), int) if nb == 1 else bands(spot.eq0[hero], nb)) for k in mine}, rounds)
            row = [page, ex(r[6]['gain']), ex(r[6]['gain_tenths']), ex(r[6]['gain_quarters']), ex(r[10]['gain']), ex(r[10]['gain_tenths']), ex(r[10]['gain_quarters']), ex(r[12]['gain']), ex(r[1]['gain'])]; tot += row; n += 1
            say(f"| {spot.name} (pot {spot.P0:g}, {spot.S:g} behind) | {'OOP' if hero == 0 else 'IP'} | " + ' | '.join(f'{x:.1f}' for x in row) + ' |')
    say('| **average** | | ' + ' | '.join(f'**{x:.1f}**' for x in tot / n) + ' |'); out.close()
