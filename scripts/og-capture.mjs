// Capturas del sitio para og:image (1200×630) y para edición libre.
//
// Uso:
//   bun run build && bun scripts/og-capture.mjs
//
// - Sirve dist/ con `astro preview` (reusa el puerto si ya hay un servidor).
// - Requiere Google Chrome / Chromium / Brave instalado (puppeteer-core no trae navegador).
// - Guarda PNG 2400×1260 (DPR 2) en raw/screenshots/ y publica raw/screenshots → public/og.jpg.
//
// Los "progress" de cada toma están en el rango global de scroll (acts.config.ts).

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import puppeteer from 'puppeteer-core';

const OUT_DIR = 'raw/screenshots';
const OG_OUT = 'public/og.jpg';
const WIDTH = 1200;
const HEIGHT = 630;
const SETTLE_MS = 3200; // el scrub de ScrollTrigger necesita un momento para asentarse

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
];

// name, progress global (0..1)
const SHOTS = [
  ['01-galaxy-hero', 0.0],
  ['02-galaxy-approach', 0.05],
  ['03-field-enter', 0.1],
  ['04-field-chapter', 0.18],
  ['05-pier-build', 0.34],
  ['06-pier-jellyfish', 0.43],
  ['07-lighthouse-piano', 0.55],
  ['08-lighthouse-album', 0.65],
  ['09-city-boot', 0.78],
  ['10-city-mailbox', 0.9],
];

function findChrome() {
  return CHROME_CANDIDATES.find((p) => existsSync(p));
}

async function waitFor(url, ms = 30000) {
  for (let i = 0; i < ms / 500; i++) {
    try {
      if ((await fetch(url)).ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function ensureServer() {
  if (await waitFor('http://localhost:4321/', 2000)) return 'http://localhost:4321';
  const child = spawn('bun', ['run', 'preview'], { stdio: ['ignore', 'pipe', 'pipe'] });
  let url = null;
  child.stdout.on('data', (d) => {
    const m = String(d).match(/https?:\/\/localhost:\d+/);
    if (m) url = m[0];
  });
  for (let i = 0; i < 60 && !url; i++) await new Promise((r) => setTimeout(r, 500));
  if (!url) throw new Error('astro preview no reportó URL (¿falló el build?)');
  if (!(await waitFor(url))) throw new Error('astro preview no respondió a tiempo');
  return { url, child };
}

const scrollToProgress = (page, progress) =>
  page.evaluate((p) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, p * max);
  }, progress);

async function main() {
  const executablePath = findChrome();
  if (!executablePath) throw new Error('No se encontró Chrome/Chromium/Brave en /Applications');

  mkdirSync(OUT_DIR, { recursive: true });
  const server = await ensureServer();
  const baseUrl = typeof server === 'string' ? server : server.url;

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      '--enable-unsafe-swiftshader', // WebGL por software en headless
      '--hide-scrollbars',
      '--mute-audio',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 2 });
    await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 90000 });
    await page.evaluate(() => document.fonts.ready);

    const webgl = await page.evaluate(() => document.documentElement.classList.contains('webgl'));
    if (!webgl) throw new Error('WebGL no disponible en headless: la captura saldría como fallback HTML');

    for (const [name, progress] of SHOTS) {
      await scrollToProgress(page, progress);
      await new Promise((r) => setTimeout(r, name === '01-galaxy-hero' ? SETTLE_MS + 3000 : SETTLE_MS));
      await page.screenshot({ path: `${OUT_DIR}/${name}.png` });
      console.log(`✓ ${OUT_DIR}/${name}.png (progress ${progress})`);
    }

    // og.jpg exacto: hero a DPR 1, JPEG
    await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });
    await scrollToProgress(page, 0);
    await new Promise((r) => setTimeout(r, SETTLE_MS + 3000));
    await page.screenshot({ path: OG_OUT, type: 'jpeg', quality: 92 });
    console.log(`✓ ${OG_OUT} (${WIDTH}×${HEIGHT}, JPEG q92)`);
  } finally {
    await browser.close().catch(() => {});
    if (typeof server !== 'string') server.child.kill();
  }
}

main().catch((err) => {
  console.error(`✗ ${err.message}`);
  process.exit(1);
});
