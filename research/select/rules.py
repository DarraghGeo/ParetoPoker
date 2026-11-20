"""With the solver's frequencies kept, how far outside the tolerance do common-sense hand choices land?
At each decision every action gets the share of the range the solver gives it; a rule decides which hands fill it. Each
hand's loss is what its assigned action gives up against its best one, in % of the pot at the decision.
  python3 research/select/rules.py <select-file.jsonl>
Rules: equity (value from the top, bluffs from the bottom, folds from the bottom), blockers (the same, but bluffs are the
weak hands that block most of his strong hands), random (bluffs any weak hand, value any strong hand), solver (its own
mix, the floor)."""
import json, sys, collections, random

random.seed(3)


def fill(order, amount, left):
    """Take `amount` of weight from hands in `order`, limited by what each has left; returns {index: weight}."""
    out = {}
    for i in order:
        if amount <= 1e-12: break
        t = min(left[i], amount)
        if t > 0: out[i] = t; left[i] -= t; amount -= t
    return out


def assign(d, rule):
    hs = d['hands']; k = len(d['kinds']); left = [h['w'] for h in hs]; P = [[0.0] * k for _ in hs]
    T = [sum(h['w'] * h['p'][a] for h in hs) for a in range(k)]; V = [sum(h['w'] * h['p'][a] for h in hs if h['e'] >= 0.5) for a in range(k)]
    idx = list(range(len(hs))); top = sorted(idx, key=lambda i: -hs[i]['e']); bottom = top[::-1]
    weak = [i for i in bottom if hs[i]['e'] < 0.35]; rest = [i for i in bottom if hs[i]['e'] >= 0.35]
    if rule == 'blockers': bluffs = sorted(weak, key=lambda i: hs[i]['ubStrong']) + rest
    elif rule == 'unblockFolds' and hs[0].get('ubFolds') is not None: bluffs = sorted(weak, key=lambda i: -hs[i]['ubFolds']) + rest
    elif rule == 'random': bluffs = random.sample(weak, len(weak)) + rest
    else: bluffs = bottom
    value = top
    if rule == 'random': strong = [i for i in top if hs[i]['e'] >= 0.7]; value = random.sample(strong, len(strong)) + [i for i in top if hs[i]['e'] < 0.7]
    passive = 0 if d['toCall'] <= 0 else d['kinds'].index('call')
    aggressive = [a for a in range(k) if a != passive and d['kinds'][a] != 'fold'][::-1]
    for a in aggressive:                                          # the biggest bet or raise first: the strongest value, the weakest bluffs
        for i, w in fill(value, V[a], left).items(): P[i][a] += w
    if rule.startswith('near') and d['toCall'] > 0:          # folds first, so the bluff raises are the best of the hands that would not call
        f = d['kinds'].index('fold'); order = bottom
        if rule.startswith('nearDraw'): bonus = float(rule[8:] or 10) / 100; order = sorted(idx, key=lambda i: hs[i]['e'] + (bonus if hs[i].get('come', 0) >= 8 else 0))   # a hand with eight outs or more counts as that many points stronger
        for i, w in fill(order, T[f], left).items(): P[i][f] += w
        bluffs = [i for i in order if left[i] > 0]
    for a in aggressive:
        for i, w in fill(bluffs, T[a] - V[a], left).items(): P[i][a] += w
    if d['toCall'] > 0 and not rule.startswith('near'):
        f = d['kinds'].index('fold')
        for i, w in fill(bottom, T[f], left).items(): P[i][f] += w
    for i in idx: P[i][passive] += left[i]
    return P


def main(path):
    rules = ['solver', 'equity', 'blockers', 'unblockFolds', 'near', 'nearDraw5', 'nearDraw10', 'nearDraw20', 'random']; acc = collections.defaultdict(lambda: collections.Counter())
    for t in open(path):
        d = json.loads(t); sit = ('first' if d['toCall'] <= 0 else 'facing') + (' oop' if d['seat'] == 0 else ' ip')
        for rule in rules:
            P = [[h['w'] * x for x in h['p']] for h in d['hands']] if rule == 'solver' else assign(d, rule); c = acc[(sit, rule)]
            for h, p in zip(d['hands'], P):
                best = max(h['v'])
                for a, w in enumerate(p):
                    if w <= 0: continue
                    loss = best - h['v'][a]; kind = d['kinds'][a]; c['w'] += w; c['loss'] += w * loss
                    for e in (0.5, 1, 2, 5):
                        if loss > e: c[f'over{e}'] += w
                    part = 'passive' if kind in ('check', 'call') else 'fold' if kind == 'fold' else ('value' if h['e'] >= 0.5 else 'bluff')
                    c['w:' + part] += w; c['loss:' + part] += w * loss
    print(f'# {path.split("/")[-1]}\n\n| Situation | Hands chosen by | Mean loss | Over 0.5% | Over 1% | Over 2% | Over 5% | Loss per hand: value / bluff / check or call / fold |\n|---|---|---|---|---|---|---|---|')
    for (sit, rule), c in sorted(acc.items(), key=lambda x: (x[0][0], rules.index(x[0][1]))):
        parts = ' / '.join(f"{c['loss:' + p] / c['w:' + p]:.2f}" if c['w:' + p] > 0 else '-' for p in ('value', 'bluff', 'passive', 'fold'))
        print(f"| {sit} | {rule} | {c['loss'] / c['w']:.2f} | " + ' | '.join(f"{100 * c[f'over{e}'] / c['w']:.0f}%" for e in (0.5, 1, 2, 5)) + f' | {parts} |')


if __name__ == "__main__" and sys.argv[-1] != "x": main(sys.argv[1])
