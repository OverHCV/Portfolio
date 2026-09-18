// Depuración: consola + estado del atlas de MathGlyphs en el Acto 2.
import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--enable-unsafe-swiftshader'],
  defaultViewport: { width: 1280, height: 800 },
});
const page = await browser.newPage();
page.on('console', (m) => console.log(`[console.${m.type()}] ${m.text().slice(0, 300)}`));
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}\n${(e.stack || '').split('\n').slice(0, 6).join('\n')}`));
page.on('response', (r) => { if (r.url().includes('mathjax')) console.log(`[resp ${r.status()}] ...${r.url().slice(-70)}`); });
page.on('requestfailed', (r) => console.log(`[reqfail] ${r.url().slice(-80)} ${r.failure()?.errorText}`));

await page.goto('http://localhost:4321/', { waitUntil: 'networkidle2', timeout: 60000 });
await new Promise((r) => setTimeout(r, 2000));

const max = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
await page.evaluate((y) => window.scrollTo(0, y), Math.round(max * 0.2));
await new Promise((r) => setTimeout(r, 6000));
await page.mouse.move(640, 400);
await new Promise((r) => setTimeout(r, 1000));

const report = await page.evaluate(() => {
  const a = window.__mathAtlas;
  if (!a) return { atlas: 'MISSING' };
  const c = a.texture.image; // HTMLCanvasElement
  const ctx = c.getContext('2d');
  const { data } = ctx.getImageData(0, 0, c.width, c.height);
  let glyph = 0, shadow = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 200) (data[i] > 128 ? glyph++ : shadow++);
  }
  return { atlas: 'ok', entries: a.entries.length, canvas: `${c.width}x${c.height}`, glyphPx: glyph, shadowPx: shadow };
});
console.log('ATLAS', JSON.stringify(report));
await page.screenshot({ path: '/tmp/act2-fixed.png' });
await browser.close();
console.log('done');
