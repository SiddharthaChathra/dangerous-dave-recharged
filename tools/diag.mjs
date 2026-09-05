import { chromium } from '@playwright/test';

const BASE = process.argv[2] || 'http://localhost:5199/dangerous-dave-recharged/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const logs = [];
page.on('pageerror', (e) => logs.push('PAGEERROR: ' + e.message + ' :: ' + (e.stack || '').split('\n')[1]));
page.on('console', (m) => logs.push(m.type().toUpperCase() + ': ' + m.text().slice(0, 200)));

await page.goto(BASE, { waitUntil: 'load' });
await page.waitForTimeout(1500);

const before = await page.evaluate(() => {
  const g = window.__ddrDebugGame;
  return {
    scenes: g.scene.scenes.map((s) => ({ k: s.scene.key, active: s.scene.isActive() })),
    hudHidden: document.querySelector('.hud')?.className,
  };
});

// Click Play and capture any synchronous throw from the handler
const clickResult = await page.evaluate(() => {
  const btn = document.querySelector('[data-menu="play"]');
  if (!btn) return { error: 'no play button' };
  try {
    btn.click();
    return { clicked: true };
  } catch (e) {
    return { error: String(e && e.message), stack: String((e && e.stack) || '').split('\n').slice(0, 4) };
  }
});

await page.waitForTimeout(1500);

const after = await page.evaluate(() => {
  const g = window.__ddrDebugGame;
  const play = g.scene.getScene('Play');
  return {
    scenes: g.scene.scenes.map((s) => ({ k: s.scene.key, active: s.scene.isActive() })),
    hudClass: document.querySelector('.hud')?.className,
    playHasPlayer: !!play?.player,
    playLevel: play?.level?.id ?? null,
    screens: Array.from(document.querySelectorAll('#ui-root .screen')).map((e) => e.className),
  };
});

console.log(JSON.stringify({ before, clickResult, after, logs: logs.slice(-25) }, null, 2));
await browser.close();
