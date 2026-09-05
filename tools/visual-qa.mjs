/**
 * Visual QA harness.
 *
 * Drives the real game in headless Chromium (where requestAnimationFrame runs at full
 * speed, unlike a backgrounded devtools pane) and captures screenshots of the moments
 * that matter for gameplay feel: idle, running, jumping, landing, collecting, damage,
 * checkpoints and level completion.
 *
 * Usage: node tools/visual-qa.mjs [baseUrl] [levelId] [outDir]
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:5199/dangerous-dave-recharged/';
const LEVEL = process.argv[3] || 'level001';
const OUT = process.argv[4] || 'qa-shots';

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });

const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('console: ' + m.text());
});

const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/${name}.png` });
};

const hud = () =>
  page.evaluate(() => {
    const t = (sel) => document.querySelector(sel)?.textContent ?? null;
    return {
      score: t('#hud-score') ?? t('[data-hud="score"]'),
      lives: t('#hud-lives') ?? t('[data-hud="lives"]'),
      gems: t('#hud-gems') ?? t('[data-hud="collectibles"]'),
      timer: t('#hud-timer') ?? t('[data-hud="timer"]'),
    };
  });

const playerPos = () =>
  page.evaluate(() => {
    const g = window.__ddrDebugGame;
    const s = g?.scene?.getScene('Play');
    const p = s?.player?.sprite;
    return p ? { x: Math.round(p.x), y: Math.round(p.y) } : null;
  });

const fps = async () => {
  return page.evaluate(async () => {
    const g = window.__ddrDebugGame;
    if (!g) return null;
    const f0 = g.loop.frame;
    await new Promise((r) => setTimeout(r, 1000));
    return g.loop.frame - f0;
  });
};

const results = {};

await page.goto(BASE, { waitUntil: 'load' });
await page.waitForTimeout(1600);
await shot('01-menu');
results.menu = { visible: await page.locator('[data-menu="play"]').isVisible().catch(() => false) };

// Enter the level through the real UI path (DOM click is deterministic here; Playwright's
// actionability-checked click races the menu's staggered entrance animation).
await page.evaluate((levelId) => {
  const card = document.querySelector(`.level-card[data-level="${levelId}"]:not(.level-card--locked)`);
  if (card) card.click();
  else document.querySelector('[data-menu="play"]')?.click();
}, LEVEL);
await page.waitForSelector('.hud:not(.hud--hidden)', { timeout: 10000 }).catch(() => {});
await page.waitForTimeout(900);

results.fpsInGame = await fps();
results.hudAtStart = await hud();
await shot('02-gameplay-idle');

// Run right
const p0 = await playerPos();
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(650);
await shot('03-running');
// Jump while running
await page.keyboard.down('ArrowUp');
await page.waitForTimeout(140);
await shot('04-jump-rise');
await page.keyboard.up('ArrowUp');
await page.waitForTimeout(260);
await shot('05-jump-apex');
await page.waitForTimeout(420);
await shot('06-landing');
await page.keyboard.up('ArrowRight');
const p1 = await playerPos();
results.movement = { from: p0, to: p1, moved: p0 && p1 ? p1.x > p0.x : null };

// Keep running to reach gems / hazards further into the level
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(2500);
await page.keyboard.up('ArrowRight');
await shot('07-mid-level');
results.hudMidLevel = await hud();

// Timer must advance — proves the game loop and HUD wiring both work
results.timerAdvanced =
  Number(String(results.hudMidLevel.timer).replace(/\D/g, '')) >
  Number(String(results.hudAtStart.timer).replace(/\D/g, ''));

// Damage: teleport onto the first hazard, capture the reaction
await page.evaluate(() => {
  const g = window.__ddrDebugGame;
  const s = g?.scene?.getScene('Play');
  const hz = s?.hazards?.[0];
  if (s && hz) s.player.setPosition(hz.sprite.x, hz.sprite.y - 30);
});
await page.waitForTimeout(180);
await shot('08-damage');
results.hudAfterDamage = await hud();

// Pause overlay
await page.keyboard.press('Escape');
await page.waitForTimeout(450);
await shot('09-pause');
results.pauseWorks = await page.locator('[data-pause="resume"]').isVisible().catch(() => false);
// Report whether a real mouse click would actually reach the button (HUD/touch overlays
// with a higher z-index can swallow it) before falling back to a direct DOM click.
results.resumeClickable = await page.evaluate(() => {
  const btn = document.querySelector('[data-pause="resume"]');
  if (!btn) return 'no-button';
  const r = btn.getBoundingClientRect();
  const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return top === btn || btn.contains(top) ? true : `blocked-by:${top?.className || top?.tagName}`;
});
if (results.pauseWorks) {
  await page.evaluate(() => document.querySelector('[data-pause="resume"]')?.click());
  await page.waitForTimeout(350);
}

// Level complete
await page.evaluate(() => window.__ddrTestHooks?.completeLevel?.());
await page.waitForTimeout(700);
await shot('10-level-complete');
results.levelCompleteShown = await page
  .getByText(/level complete/i)
  .isVisible()
  .catch(() => false);

results.errors = errors;
console.log(JSON.stringify(results, null, 2));
await browser.close();
