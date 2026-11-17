// Page shots of the river table pictures.   node research/butterfly/guide/shots.cjs
const { chromium } = require('playwright'); const path = require('node:path'); const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 868, height: 200 }, deviceScaleFactor: 2 });
  for (const f of fs.readdirSync(__dirname).filter((x) => /^river-.*\.html$/.test(x))) { await page.goto('file://' + path.join(__dirname, f)); await page.evaluate(() => document.fonts.ready); await page.screenshot({ path: path.join(__dirname, f.replace('.html', '.png')), fullPage: true }); }
  await browser.close();
})();
