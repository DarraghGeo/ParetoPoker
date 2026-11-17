# Does a hard-to-exploit river table also lose little to sound play? On the river spots the tables were not solved on,
# for each table: what the best reply wins from it (exploitability), and what it gives up against the solver's own
# equilibrium play (EV lost), both in percent of the pot for the whole river. The same for the two pages' river tables.
#   STORE=<dir> python3 research/butterfly/restricted_ev.py [spots to solve on] [spots to score on]   ->  restricted-ev.md
import os, sys, json, re
HERE = os.path.dirname(os.path.abspath(__file__))
MAIN = "\nif __name__ == '__main__':"
exec(open(os.path.join(HERE, 'restricted_river.py')).read().split(MAIN)[0])
_page = open(os.path.join(HERE, 'restricted_page.py')).read().split(MAIN)[0]; exec(_page[_page.index('TAB = json.load'):])          # the two pages' tables: page_strategy
n_tr = int(sys.argv[1]) if len(sys.argv) > 1 else 40; n_te = int(sys.argv[2]) if len(sys.argv) > 2 else 24; rows = []
for text in open(os.path.join(STORE, 'river-real.jsonl')):
    if '"line":"r|"' not in text: continue
    d = json.loads(text)
    if d['seat'] == 0 and 60 <= len(d['hands']) <= 260 and 60 <= len(d['vr']) <= 260: d['flop'] = re.search(r'f\d+', d['spot']).group(0); rows.append(d)
rng = np.random.default_rng(4); flops = sorted({d['flop'] for d in rows}); rng.shuffle(flops); held = set(flops[: len(flops) // 3]); rng.shuffle(rows)      # the same split as restricted_river.py
S_te = [River(d) for d in [x for x in rows if x['flop'] in held][:n_te]]; J = json.load(open(os.path.join(HERE, 'restricted-river-tables.json')))
EQ = {id(sp): equilibrium(sp, 800) for sp in S_te}; out = open(os.path.join(HERE, 'restricted-ev.md'), 'w')
def say(*a): print(*a); print(*a, file=out); out.flush()
def lay(sp, hero, tab, hand, read):
    rb, nr = read_of(sp, hero, read); b, nh = hand_cells(sp, hero, hand); sig = {}
    for k in sp.dec:
        if sp.nodes[k][0] != hero: continue
        kd, amap = kind_of(sp, k, hero); cells = b * nr + rb; s = np.zeros((len(cells), len(sp.nodes[k][1]))); np.add.at(s.T, np.array(amap), np.array(tab[kd])[cells].T); sig[k] = s
    return sig
def both(sp, hero, sig):
    """Exploitability and EV given up to equilibrium play, percent of the pot."""
    eq = EQ[id(sp)]; opp = 1 - hero; star = sp.values(hero, eq[hero], eq[opp])[0]; floor_opp = sp.best_reply(hero, eq[hero])[0]
    return 100 * (sp.best_reply(hero, sig)[0] - floor_opp) / sp.P0, 100 * (star - sp.values(hero, sig, eq[opp])[0]) / sp.P0
say(f'# Exploitability and EV lost to sound play, side by side ({len(S_te)} river spots the tables were not solved on)\n')
say('Percent of the pot, for the whole river (every decision on the street together). "Best reply wins" is the most any opponent can take; "gives up to the solver" is what the solver\'s own equilibrium play takes.\n')
say('| river tables | seat | best reply wins: mean | worst spot | gives up to the solver: mean | P90 | worst spot |'); say('|---|---|---|---|---|---|---|')
def line(name, hero, pairs):
    ex = np.array([p[0] for p in pairs]); ev = np.array([p[1] for p in pairs]); say(f"| {name} | {'OOP' if hero == 0 else 'IP'} | {ex.mean():.1f} | {ex.max():.1f} | {ev.mean():.2f} | {np.percentile(ev, 90):.2f} | {ev.max():.2f} |"); return ex.mean(), ev.mean()
for hero in (0, 1): line('the two pages\' tables (one answer a cell, built against the solver)', hero, [both(sp, hero, page_strategy(sp, hero, EQ[id(sp)])) for sp in S_te])
for key, name in (('equity|None', 'solved: equity bands'), ('place|my weak hands', 'solved: place in own range x own weak hands'), ('place x equity|None', 'solved: place x equity')):
    hand, read = key.split('|'); read = None if read == 'None' else read
    for steps, tag in ((None, 'exact'), (10, '10% steps'), (4, '25% steps')):
        for hero in (0, 1):
            tab = {k: (np.array(v) if steps is None else quarters(np.array(v), steps)) for k, v in J['tables'][f'{key}|{hero}'].items()}; line(f'{name}, {tag}', hero, [both(sp, hero, lay(sp, hero, tab, hand, read)) for sp in S_te])
for hero in (0, 1): line('the solver\'s own play (check)', hero, [both(sp, hero, EQ[id(sp)][hero]) for sp in S_te])
out.close()
