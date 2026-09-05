import { chromium } from '@playwright/test';

const URL = process.argv[2] || 'https://siddharthachathra.github.io/dangerous-dave-recharged/';

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('console: ' + m.text());
});

const results = {};
await page.goto(URL, { waitUntil: 'load' });
await page.waitForTimeout(1500);

results.title = await page.title();
results.menuVisible = await page.locator('[data-menu="play"]').isVisible().catch(() => false);

// Start the game
await page.locator('[data-menu="play"]').click();
await page.waitForTimeout(1200);
results.hudVisible = await page.locator('[data-hud="score"]').isVisible().catch(() => false);

const readHud = async () => ({
  score: await page.locator('[data-hud="score"]').textContent().catch(() => null),
  lives: await page.locator('[data-hud="lives"]').textContent().catch(() => null),
  gems: await page.locator('[data-hud="collectibles"]').textContent().catch(() => null),
  timer: await page.locator('[data-hud="timer"]').textContent().catch(() => null),
});

results.hudInitial = await readHud();

// Timer should advance (proves the game loop is running)
await page.waitForTimeout(2500);
results.hudAfterWait = await readHud();
results.timerAdvanced =
  Number(results.hudAfterWait.timer) > Number(results.hudInitial.timer);

// Movement: hold ArrowRight, confirm the player's world x actually increases
const playerX = () =>
  page.evaluate(() => {
    const g = window.__ddrDebugGame;
    if (!g) return null;
    const s = g.scene.getScene('Play');
    if (!s) return null;
    const p = s.children.list.find((c) => c.type === 'Sprite' && c.body && c.body.velocity);
    return p ? Math.round(p.x) : null;
  });

const beforeX = await playerX();
await page.keyboard.down('ArrowRight');
await page.waitForTimeout(900);
await page.keyboard.up('ArrowRight');
const afterX = await playerX();
results.playerMoved = beforeX !== null && afterX !== null ? afterX > beforeX : 'no-debug-hook';
results.beforeX = beforeX;
results.afterX = afterX;

// Jump
await page.keyboard.press('ArrowUp');
await page.waitForTimeout(400);

// Pause via ESC, confirm the pause menu appears, then resume
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
results.pauseMenuAppeared = await page
  .locator('[data-pause="resume"]')
  .isVisible()
  .catch(() => false);

if (results.pauseMenuAppeared) {
  await page.locator('[data-pause="resume"]').click();
  await page.waitForTimeout(400);
  results.pauseMenuDismissed = !(await page
    .locator('[data-pause="resume"]')
    .isVisible()
    .catch(() => false));
}

results.errors = errors;
console.log(JSON.stringify(results, null, 2));
await browser.close();
