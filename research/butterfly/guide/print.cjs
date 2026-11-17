// The guide as a PDF, with page shots to check the layout.   node research/butterfly/guide/print.cjs [shots-dir]
const { chromium } = require('playwright'); const path = require('node:path');
const here = (f) => path.join(__dirname, f);
(async () => {
const browser = await chromium.launch(); const page = await browser.newPage();
const two = process.argv[2] === 'two';
  await page.goto('file://' + here(two ? './two-pages.html' : './guide.html')); await page.evaluate(() => document.fonts.ready);
if (two) { await page.pdf({ path: here('./pareto-two-pages.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true }); await browser.close(); return; }
  await page.pdf({ path: here('./pareto-twelve-spots.pdf'), format: 'A4', printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>',
  footerTemplate: '<div style="font-size:7px;color:#6B6F77;width:100%;text-align:center;font-family:Inter,sans-serif">Pareto · Twelve spots, one chart · <span class="pageNumber"></span></div>', margin: { top: '16mm', bottom: '16mm', left: '15mm', right: '15mm' } });
await browser.close();
})();
