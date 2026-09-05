/**
 * Mobile-viewport screenshots: menu and in-level, with touch emulation on so the
 * on-screen controls render. Usage: node tools/mobile-shots.mjs
 */
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const BASE = 'http://localhost:5173';
const OUT = 'qa-shots/mobile';
mkdirSync(OUT, { recursive: true });

const server = spawn('npm', ['run', 'dev', '--', '--port', '5173'], { shell: true, stdio: 'ignore' });
process.on('exit', () => server.kill());

for (let i = 0; i < 60; i++) {
  try {
    if ((await fetch(BASE)).ok) break;
  } catch {
    /* not up yet */
  }
  await sleep(500);
}

const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['Pixel 5'] });
const page = await context.newPage();
await page.goto(BASE, { waitUntil: 'networkidle' });
await sleep(1500);
await page.screenshot({ path: `${OUT}/menu.png` });

await page.evaluate(() => document.querySelector('[data-menu="play"]')?.click());
await sleep(2000);
await page.screenshot({ path: `${OUT}/level.png` });

await browser.close();
server.kill();
console.log(`wrote mobile shots to ${OUT}`);
process.exit(0);
