// Equity curves as the charts draw them: a range's hands as steps along the width, each as wide as its weight, at its
// equity's height.
export const W = 560;

/** The height on a chart `h` high, padded `pad`, of an equity from 0 to 1. */
export const yOf = (h, pad) => (e) => h - pad - e * (h - 2 * pad);

/** A list of { w, e } as the points of a step line, and where each step's middle is (by `name`, where given). */
export function stepsOf(list, Y, width = W) {
  const total = list.reduce((t, r) => t + r.w, 0); let x = 0; const pts = []; const mid = new Map();
  for (const r of list) {
    const w = r.w / total;
    pts.push(`${(x * width).toFixed(1)},${Y(r.e).toFixed(1)} ${((x + w) * width).toFixed(1)},${Y(r.e).toFixed(1)}`);
    if (r.name) mid.set(r.name, { x: x + w / 2, e: r.e });
    x += w;
  }
  return { points: pts.join(' '), mid };
}
