/* Run with: node tests/setup-layout.browser.cjs OUTPUT PLAYWRIGHT_MODULE */
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const {chromium} = require(process.argv[3] || 'playwright');

const root = path.resolve(__dirname, '../public/setup');
const output = path.resolve(process.argv[2]);
const device = `navi_${'a'.repeat(32)}`;
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp'};

async function main() {
  await fs.mkdir(output, {recursive:true});
  const server = http.createServer(async (request, response) => {
    try {
      const name = new URL(request.url, 'http://localhost').pathname.replace(/^\/setup\/?/, '') || 'index.html';
      const file = path.resolve(root, name);
      if (!file.startsWith(root + path.sep)) {response.writeHead(403);response.end();return;}
      response.writeHead(200, {'Content-Type':mime[path.extname(file)] || 'application/octet-stream'});
      response.end(await fs.readFile(file));
    } catch {response.writeHead(404);response.end();}
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({headless:true, ...(process.env.NAVI_BROWSER_CHANNEL ? {channel:process.env.NAVI_BROWSER_CHANNEL} : {})});
  try {
    for (const engineering of [true, false]) {
      const page = await browser.newPage({viewport:{width:390,height:844}});
      const mode = engineering ? 'engineering' : 'production';
      await page.goto(`http://127.0.0.1:${server.address().port}/setup/#device=${device}${engineering ? '&engineering=1' : ''}`);
      await page.getByRole('button', {name:/Use Wi-Fi/}).click();
      const ap = page.locator('#open-wireless');
      const home = page.locator('#open-home');
      assert.equal(await page.locator('#return-home').isVisible(), true);
      assert.match(await ap.getAttribute('class'), /primary/);
      assert.match(await home.getAttribute('class'), /secondary/);
      assert.equal(await home.getAttribute('href'), engineering
        ? `http://harbornavi-aaaaaaaa.local/ui/setup?handoff=wifi#device=${device}`
        : `https://navi-${'a'.repeat(32)}.lan.harbornavi.com/ui/setup?connection=wifi#device=${device}`);
      for (const width of [320, 390, 1280]) {
        await page.setViewportSize({width,height:844});
        const boxes = await page.evaluate(() => {
          const rect = selector => {
            const {top,bottom,left,right,width,height} = document.querySelector(selector).getBoundingClientRect();
            return {top,bottom,left,right,width,height};
          };
          return {scrollWidth:document.documentElement.scrollWidth,
            ap:rect('#open-wireless'),home:rect('#open-home')};
        });
        assert.ok(boxes.scrollWidth <= width, `${mode} overflows at ${width}px`);
        assert.ok(boxes.home.top >= boxes.ap.bottom, `${mode} links overlap at ${width}px`);
        assert.ok(boxes.ap.height >= 48 && boxes.home.height >= 48, `${mode} touch target too small at ${width}px`);
        if (width !== 320) await page.screenshot({path:path.join(output, `${mode}-${width}.png`),fullPage:true});
      }
      await page.close();
      process.stdout.write(`PASS ${mode} Wi-Fi guide at 320, 390, and 1280 px\n`);
    }
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => {console.error(error);process.exitCode = 1;});
