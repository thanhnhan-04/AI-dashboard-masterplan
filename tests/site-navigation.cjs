// Run with PLAYWRIGHT_MODULE pointing to an installed Playwright package.
// Optional SITE_BASE tests an already published release instead of local files.
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'data/site-release.json')));
const prefix = '/AI-dashboard-masterplan/';
(async () => {
  let server, browser;
  try {
    let base = process.env.SITE_BASE;
    if (!base) {
      server = http.createServer((req, res) => {
        let name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        if (!name.startsWith(prefix)) { res.writeHead(404).end(); return; }
        name = name.slice(prefix.length);
        if (!name || name.endsWith('/')) name += 'index.html';
        const file = path.resolve(root, name);
        if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
        const types = {'.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.json':'application/json'};
        res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
        res.end(fs.readFileSync(file));
      });
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      base = `http://127.0.0.1:${server.address().port}${prefix}`;
    }
    browser = await chromium.launch({headless:true, executablePath:process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
    const page = await browser.newPage({viewport:{width:1440,height:1000}});
    const errors = [], missing = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if(response.url().startsWith(base) && response.status() >= 400) missing.push(response.url()); });
    const expected = key => new URL(manifest.routes[key], base).pathname;
    async function checkRoute(key) {
      await page.waitForURL(url => url.pathname === expected(key));
      await page.waitForLoadState('networkidle');
      assert.equal(new URL(page.url()).searchParams.get('v'), manifest.version);
      assert.equal(await page.locator('[data-site-navigation] [aria-current="page"]').getAttribute('data-site-route'), key);
    }
    for (const [hash,key] of [['ngan-hang','bank'],['dau-khi','oil'],['duong','sugar']]) {
      await page.goto(base+'?v=20260911#'+hash);
      await checkRoute(key);
    }
    await page.goto(base+'?v='+manifest.version);
    assert.equal(await page.locator('#readyDashboards a').count(), 3);
    for (const key of ['oil','sugar','bank']) {
      await page.locator('#readyDashboards [data-site-route="'+key+'"]').click();
      await checkRoute(key);
      assert.equal(await page.locator('.majortabbtn').count(), 7);
      assert.ok(await page.locator('svg').count() > 10);
      assert.ok(await page.locator('.source-info-panel').count() > 0);
      assert.ok(await page.evaluate(key => key === 'bank' ? !!window.BANK_WI_DATA : !!window.SECTOR_DAILY, key));
      for (let tab=0; tab<7; tab++) {
        await page.locator('.majortabbtn').nth(tab).click();
        assert.equal(new URL(page.url()).pathname, expected(key));
      }
      if(key !== 'bank') assert.equal(await page.locator('.supply-tabs').count(), 1);
      await page.locator('.majortabbtn').first().click();
      for (const width of [1440,390]) {
        await page.setViewportSize({width,height:1000});
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1), `${key} overflows at ${width}`);
        await page.screenshot({path:`/private/tmp/navigation-${key}-${width}.png`});
      }
      await page.locator('[data-site-navigation] [data-site-route="home"]').click();
      await checkRoute('home');
    }
    for (const from of ['oil','sugar','bank']) {
      for (const to of ['oil','sugar','bank'].filter(key => key !== from)) {
        await page.goto(base+manifest.routes[from]+'?v='+manifest.version);
        await page.locator('[data-site-navigation] [data-site-route="'+to+'"]').click();
        await checkRoute(to);
        await page.goBack();
        await checkRoute(from);
      }
    }
    await page.goto(base+'duong/');
    await checkRoute('sugar');
    await page.locator('[data-site-navigation] [data-site-route="home"]').click();
    await checkRoute('home');
    for (const width of [1440,390]) {
      await page.setViewportSize({width,height:1000});
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1), `hub overflows at ${width}`);
      await page.screenshot({path:`/private/tmp/navigation-home-${width}.png`});
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(missing, []);
    console.log(JSON.stringify({result:'PASS',base,version:manifest.version,checks:'3 hub cards, legacy hashes, 6 cross-sector paths + Back, 21 section tabs, charts/data, home, duong alias, desktop/390px, no JS/HTTP errors'}));
  } finally {
    if(browser) await browser.close();
    if(server) await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode=1; });
