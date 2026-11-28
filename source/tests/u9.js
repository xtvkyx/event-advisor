const { chromium } = require('playwright');
const file = 'file://' + __dirname + '/../advisor_simple.html';
async function open(page) {
  await page.goto(file); await page.waitForTimeout(500);
  await page.evaluate(() => { const t = [...document.querySelectorAll('.tab')].find(e => e.textContent.includes('ماذا حصل')); t && t.click(); });
  await page.waitForTimeout(500);
}
(async () => {
  const b = await chromium.launch();
  for (const [name, vp] of [['desk', { width: 1280, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
    const page = await b.newPage({ viewport: vp, deviceScaleFactor: name === 'desk' ? 1 : 2 });
    const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => m.type() === 'error' && errs.push('console: ' + m.text()));
    await open(page);
    const r = await page.evaluate(() => {
      const svg = document.querySelector('.chartbox.pc svg');
      const bars = svg ? [...svg.querySelectorAll('circle')].map(x => x.querySelector('title').textContent) : [];
      const txt = svg ? [...svg.querySelectorAll('text')].map(t => t.textContent) : [];
      const pb = [...document.querySelectorAll('.pbr')].map(r => r.querySelector('b').textContent + ' → ' + r.querySelector('.sbx').getAttribute('aria-label'));
      const tbl = [...document.querySelectorAll('#p-happened table')].map(t => [...t.querySelectorAll('tr')].slice(0, 6).map(tr => [...tr.children].slice(0, 3).map(c => c.textContent.trim().replace(/[⁦⁩]/g, '').replace(/\s+/g, ' ')).join(' | ')));
      const over = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      const chartH3 = [...document.querySelectorAll('#p-happened h3')].map(h => h.textContent.trim());
      const svgBox = svg ? svg.getBoundingClientRect() : null;
      return { bars, txt: txt.slice(0, 40).join(' / '), pb, tbl, over, chartH3, svgW: svgBox && Math.round(svgBox.width) };
    });
    console.log('===', name); console.log(JSON.stringify(r, null, 1)); console.log('errors:', errs);
    const el = await page.$('#p-happened .chartbox.pc'); if (el) { await el.scrollIntoViewIfNeeded(); }
    const card = await page.evaluateHandle(() => document.querySelector('.chartbox.pc').closest('.card'));
    await card.asElement().screenshot({ path: `u9_period_${name}.png` });
    const pc = await page.evaluateHandle(() => document.querySelector('.pbc').closest('.card'));
    await pc.asElement().screenshot({ path: `u9_plat_${name}.png` });
    await page.close();
  }
  await b.close();
})();
