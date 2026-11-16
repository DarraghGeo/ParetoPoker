// Study's solver, off the main thread: solves a spot with poker-flopsolve and answers questions about it.
import { held } from './study/held.js';
import { preview } from './study/preview.js';
import { QUESTIONS, ask, fits } from './study/questions.js';
import { solve } from './study/solve.js';

const handlers = {
  stop: () => { held.halt = true; },
  adopt: (data) => { held.adopted = { key: data.key, sums: data.sums, exploit: data.exploit, lite: !!data.lite }; },
  solve, fits, preview,
  ...Object.fromEntries(QUESTIONS.map((type) => [type, ask])),
};
self.onmessage = ({ data }) => handlers[data.type]?.(data);
