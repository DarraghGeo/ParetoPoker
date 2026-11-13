import { Mixer, Tuner, presets, sizeNear } from '../src/index.js';
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const turnOpen = (seat) => (c) => c.street === 'turn' && c.position === seat && !c.facing;
const oopBet = (c) => { const p = c.profile; return clamp(0.26 + 1.97 * p.rangeAdvantage - 0.64 * p.nutAdvantage + 2.72 * p.polarizationAdvantage, 0.05, 0.9); };
function make({ rules = [], mix = [] }) {
  return () => { const base = presets.fitted(); return { selector: base.selector, mixer: new Mixer([...base.mixer.rules, ...mix]), tuner: new Tuner([...base.tuner.rules, ...rules]) }; };
}
export const variants = {
  'fitted (D)': presets.fitted,
  'oop turn bet frequency from the spot': make({ rules: [{ when: turnOpen('oop'), set: (c) => ({ frequency: oopBet(c) }) }] }),
  'oop turn value bets 45%': make({ mix: [{ role: 'value', when: turnOpen('oop'), share: 0.45 }] }),
  'oop turn frequency from the spot + value 45%': make({ rules: [{ when: turnOpen('oop'), set: (c) => ({ frequency: oopBet(c) }) }], mix: [{ role: 'value', when: turnOpen('oop'), share: 0.45 }] }),
  'turn open size 0.75 oop / 0.5 ip': make({ rules: [{ when: turnOpen('oop'), set: { sizing: sizeNear(0.75) } }, { when: turnOpen('ip'), set: { sizing: sizeNear(0.5) } }] }),
  'ip turn: strongest 15% always, other value 55%': make({ mix: [{ role: 'value', when: turnOpen('ip'), share: (c) => c.strength.map((e) => (e >= 0.85 ? 1 : 0.55)) }] }),
};
