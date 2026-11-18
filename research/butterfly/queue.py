# Runs a list of jobs a few at a time and skips the ones whose result file is already there, so the same list can be
# started again after a restart.   python3 research/butterfly/queue.py <jobs file> [at once]
# Each line of the jobs file: <result file> | <environment, e.g. K=4 M=5> | <command>
import os, subprocess, sys, time
jobs = [[x.strip() for x in line.split('|', 2)] for line in open(sys.argv[1]) if line.strip() and not line.startswith('#')]; at_once = int(sys.argv[2]) if len(sys.argv) > 2 else 4; running = []
for done, env, cmd in jobs:
    if os.path.exists(done): continue
    while len(running) >= at_once: running = [p for p in running if p.poll() is None]; time.sleep(5)
    e = dict(os.environ); e.update(dict(kv.split('=', 1) for kv in env.split())); log = open(done + '.log', 'a'); running.append(subprocess.Popen(cmd, shell=True, env=e, stdout=log, stderr=log)); print(time.strftime('%H:%M'), 'started', cmd, flush=True)
for p in running: p.wait()
print(time.strftime('%H:%M'), 'queue done', flush=True)
