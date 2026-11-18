# The solved answers by equity band (restricted_flop.py, CELLS=adv+eq+pot) put in the shape engine.mjs reads.
#   STORE=<dir> python3 research/engine/cells.py [run, e.g. n24-adv+eq+pot-bal-k4m5] -> cells.json
import json, os, sys
STORE = os.environ['STORE']; RUN = sys.argv[1] if len(sys.argv) > 1 else 'n24-adv+eq+pot-bal-k4m5'; HERE = os.path.dirname(os.path.abspath(__file__))
out = {seat: json.load(open(os.path.join(STORE, f'flop-{h}-{RUN}.json')))['tables'] for h, seat in ((0, 'oop'), (1, 'ip'))}
json.dump(out, open(os.path.join(HERE, 'cells.json'), 'w')); print({k: len(v) for k, v in out['oop'].items()})
