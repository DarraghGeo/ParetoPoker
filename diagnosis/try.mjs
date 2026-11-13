// Tries variants of the parts against the best response on a spot set.
//   node diagnosis/try.mjs <set> <variant-file.mjs> [setting] [name filter...]
// The file exports `variants`: name -> () => parts. Settings:
//   engine   the whole engine (default)
//   ranges   the whole engine, given the solver's range for the opponent
//   open | bet | raise   the engine decides only when first to act / facing a bet / facing a raise,
//                        inside the solver's strategy and on the solver's range (as bin/locate.js);
//                        prefix with a street to restrict it, e.g. turn:open
import { SETS, measure, format } from '../bin/compare.js';
const [set, file, setting = 'engine', ...only] = process.argv.slice(2);
const { variants } = await import(new URL(file, `file://${process.cwd()}/`));
const SITUATIONS = { open: (d) => !d.facing, bet: (d) => d.facing && d.raises === 0, raise: (d) => d.facing && d.raises > 0 };
function optionsOf(name) {
  if (name === 'engine') return {};
  if (name === 'ranges') return { ranges: 'solver', where: () => true };
  const [street, situation] = name.includes(':') ? name.split(':') : [null, name];
  return { ranges: 'solver', where: (d) => (!street || d.street === street) && SITUATIONS[situation](d) };
}
for (const [name, make] of Object.entries(variants)) {
  if (only.length && !only.some((o) => name.includes(o))) continue;
  const t = Date.now();
  console.log(`${set.padEnd(12)} ${setting.padEnd(10)} ${name.padEnd(44)} ${format(await measure(SETS[set], make, optionsOf(setting)))}  (${((Date.now() - t) / 1000).toFixed(0)}s)`);
}
