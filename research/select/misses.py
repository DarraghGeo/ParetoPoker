"""Where the equity rule (solver's frequencies, hands by equity) loses: total loss split by what the hand was told to do,
its equity band and what it would rather do.   python3 research/select/misses.py <select-file.jsonl>"""
import json, sys, collections
sys.argv.append('x'); from rules import assign  # noqa: E402
ROWS = ['nothing', 'draw', 'low pair', 'middle pair', 'top pair', 'overpair', 'two pair', 'trips+']


def main(path):
    acc = collections.defaultdict(lambda: collections.Counter()); tot = collections.Counter()
    for t in open(path):
        d = json.loads(t); sit = ('first' if d['toCall'] <= 0 else 'facing') + (' oop' if d['seat'] == 0 else ' ip'); P = assign(d, 'equity')
        sizes = [a for a, k in enumerate(d['kinds']) if k in ('bet', 'raise', 'allin')]
        for h, p in zip(d['hands'], P):
            best = max(h['v']); want = h['v'].index(best)
            for a, w in enumerate(p):
                if w <= 0: continue
                loss = best - h['v'][a]; tot[sit] += w * loss
                if loss <= 0.5: continue
                name = lambda x: d['kinds'][x] + (f' {sizes.index(x) + 1}/{len(sizes)}' if x in sizes and len(sizes) > 1 else '')
                band = int(h['e'] * 10) * 10; acc[sit][(name(a), f'{band}-{band + 10}%', name(want), ROWS[h['row']] if len(sys.argv) > 3 else '')] += w * loss
    for sit in sorted(acc):
        print(f'\n**{sit}** (told to -> would rather), share of all the loss')
        for (a, band, want, row), x in acc[sit].most_common(12): print(f'  {100 * x / tot[sit]:4.0f}%  {a:10s} with {band:8s} {row:12s} -> {want}')


main(sys.argv[1])
