/**
 * Full-playthrough QA: drives the whole player journey in a real browser and reports on it.
 *
 *   node tools/full-playthrough-qa.mjs                                  # local preview on :4173
 *   node tools/full-playthrough-qa.mjs <base-url> [screenshot-dir]      # e.g. the live site
 *
 * Covers boot, roster, settings, movement, jumping, the visual-mode toggle, pause/resume, the
 * key gate, the between-levels corridor, level progression, death and lives, game over and
 * retry, save persistence, and quitting to the menu — asserting there are no console errors
 * throughout. Exits non-zero if any check fails.
 *
 * Why it pumps the game loop: headless Chromium's frame rate is unstable and Phaser clamps
 * delta, so the simulation can run ~10x slower than wall-clock. Waiting real milliseconds for
 * game events measures the browser, not the game. `run()` steps the loop by hand so game time
 * advances predictably; `wait()` is kept for DOM and real-timer beats (the life-lost card).
 *
 * It deliberately teleports the player and disables hazards to reach specific states quickly.
 * That makes it a QA tool, not a CI gate — the CI smoke test lives in e2e/smoke.spec.ts.
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:4173/dangerous-dave-recharged/';
const SHOTS = process.argv[3] ?? 'qa-shots';
mkdirSync(SHOTS, { recursive: true });

const results = [];
const errors = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('favicon')) errors.push('console: ' + m.text());
});

const g = (expr) =>
  page.evaluate(
    (e) => new Function('game', `return ${e};`)(window.__ddrDebugGame),
    expr,
  );
const hud = (k) => page.evaluate((key) => document.querySelector(`[data-hud="${key}"]`)?.textContent?.trim(), k);
const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png` });
const wait = (ms) => page.waitForTimeout(ms);
/**
 * Advances the game loop by hand for `wallMs`. Headless Chromium's frame rate is unstable and
 * Phaser clamps delta, so real-time waits measure the browser, not the game.
 */
const run = (wallMs) =>
  page.evaluate(
    (ms) =>
      new Promise((res) => {
        const gm = window.__ddrDebugGame;
        let t = gm.loop.time;
        const pump = setInterval(() => {
          for (let i = 0; i < 4; i++) { t += 16.667; gm.step(t, 16.667); }
        }, 4);
        setTimeout(() => { clearInterval(pump); res(); }, ms);
      }),
    wallMs,
  );

// ---------------------------------------------------------------- BOOT & MENU
await page.goto(BASE, { waitUntil: 'networkidle' });
await wait(2500);
check('boots to the main menu', await page.locator('[data-menu="play"]').isVisible());
check('menu hero renders', await g("game.scene.getScene('MainMenu').scene.isActive()"));
await shot('menu');

// ---------------------------------------------------------------- ROSTER
await page.locator('[data-menu="roster"]').click();
await wait(2000);
const rosterCards = await page.locator('[data-character-card]').count();
check('roster lists every character', rosterCards === 4, `${rosterCards} cards`);
const daveState = await page.locator('[data-character-card="dave"]').getAttribute('data-character-state');
const rexState = await page.locator('[data-character-card="rex"]').getAttribute('data-character-state');
check('default character is available', daveState !== 'locked', `dave=${daveState}`);
check('unearned characters are locked', rexState === 'locked', `rex=${rexState}`);
check('roster showcase renders a canvas', await page.locator('.roster-showcase-wrap canvas').count() === 1);
await shot('roster');
await page.locator('[data-character-select="close"]').click();
await wait(800);
check('roster closes', (await page.locator('[data-character-card]').count()) === 0);

// ---------------------------------------------------------------- SETTINGS
await page.locator('[data-menu="settings"]').click();
await wait(900);
check('settings opens', await page.locator('[data-settings="close"]').isVisible());
await page.locator('[data-settings="close"]').click();
await wait(700);
check('settings closes', (await page.locator('[data-settings="close"]').count()) === 0);

// ---------------------------------------------------------------- START LEVEL 1
await page.locator('[data-menu="play"]').click();
await wait(1800);
await page.evaluate(() => document.querySelector('#hud-tutorial-dismiss')?.click());
check('level 1 loads', (await g("game.scene.getScene('Play').level.id")) === 'level001');
check('HUD starts at zero score', (await hud('score')) === '000000');
const livesAtStart = await hud('lives');
check('HUD starts with three lives', livesAtStart === '3', `lives=${JSON.stringify(livesAtStart)}`);
check('key gate is armed', (await page.locator('[data-hud="key"]').getAttribute('data-key-state')) === 'required');
check('exit door is drawn locked', String(await g("game.scene.getScene('Play').goalZone.texture.key")).includes('locked'));

// ---------------------------------------------------------------- MOVEMENT
const x0 = await g("game.scene.getScene('Play').player.sprite.x");
await page.keyboard.down('ArrowRight');
await wait(1500);
const vxHeld = await g("game.scene.getScene('Play').player.sprite.body.velocity.x");
await page.keyboard.up('ArrowRight');
const x1 = await g("game.scene.getScene('Play').player.sprite.x");
check('holding right drives the player', vxHeld > 0, `vx=${Math.round(vxHeld)}`);
check('player actually travels right', x1 > x0 + 8, `${Math.round(x0)} -> ${Math.round(x1)}`);

await page.keyboard.down('ArrowUp');
await wait(160);
const vyJump = await g("game.scene.getScene('Play').player.sprite.body.velocity.y");
await page.keyboard.up('ArrowUp');
check('jump launches the player upward', vyJump < 0, `vy=${Math.round(vyJump)}`);
await wait(900);
await shot('gameplay-modern');

// ---------------------------------------------------------------- VISUAL MODE
const beforeToggle = await g(
  "({x: Math.round(game.scene.getScene('Play').player.sprite.x), score: game.scene.getScene('Play').scoreState.score, lives: game.scene.getScene('Play').livesState.lives})",
);
await page.evaluate(() => document.querySelector('.visual-mode-toggle__btn').click());
await wait(900);
const afterToggle = await g(
  "({x: Math.round(game.scene.getScene('Play').player.sprite.x), score: game.scene.getScene('Play').scoreState.score, lives: game.scene.getScene('Play').livesState.lives})",
);
const mode = await page.evaluate(() => document.documentElement.getAttribute('data-visual-mode'));
check('visual mode switches to classic', mode === 'classic', `mode=${mode}`);
check('toggling does not move the player', Math.abs(afterToggle.x - beforeToggle.x) < 40, `${beforeToggle.x} -> ${afterToggle.x}`);
check('toggling preserves score and lives', afterToggle.score === beforeToggle.score && afterToggle.lives === beforeToggle.lives);
check('classic art is applied', String(await g("game.scene.getScene('Play').goalZone.texture.key")).startsWith('classic__'));
await shot('gameplay-classic');
await page.evaluate(() => document.querySelector('.visual-mode-toggle__btn').click());
await wait(900);

// ---------------------------------------------------------------- PAUSE
await page.locator('[data-hud="pause-button"]').click();
await wait(700);
check('pause menu opens', await page.locator('[data-pause="resume"]').isVisible());
await page.locator('[data-pause="resume"]').click();
await wait(700);
check('resume closes the pause menu', (await page.locator('[data-pause="resume"]').count()) === 0);

// ---------------------------------------------------------------- KEY GATE
await page.evaluate(() => {
  const p = window.__ddrDebugGame.scene.getScene('Play');
  p.hazards.forEach((h) => { if (h.sprite?.body) h.sprite.body.enable = false; });
  p.enemies.forEach((e) => { if (e.sprite?.body) e.sprite.body.enable = false; });
  p.player.sprite.setPosition(p.goalZone.x, p.goalZone.y);
});
await run(900);
check('locked door refuses entry', (await g("game.scene.getScene('Play').transition")) === 'playing');
check('no transition started without the key', !(await g("game.scene.getScene('LevelTransition').scene.isActive()")));

await page.evaluate(() => {
  const p = window.__ddrDebugGame.scene.getScene('Play');
  p.player.sprite.setPosition(p.levelKey.sprite.x, p.levelKey.sprite.y);
});
for (let i = 0; i < 12 && !(await g("game.scene.getScene('Play').levelKey.isCollected")); i++) {
  await run(400);
}
check('key is collected on contact', await g("game.scene.getScene('Play').levelKey.isCollected"));
check('HUD shows the key acquired', (await page.locator('[data-hud="key"]').getAttribute('data-key-state')) === 'acquired');
// The key flies to the HUD before the door changes state.
for (let i = 0; i < 12 && String(await g("game.scene.getScene('Play').goalZone.texture.key")).includes('locked'); i++) {
  await run(300);
}
const doorTex = String(await g("game.scene.getScene('Play').goalZone.texture.key"));
check('door art unlocks', !doorTex.includes('locked'), `door=${doorTex}`);

// ---------------------------------------------------------------- CORRIDOR
await page.evaluate(() => {
  const p = window.__ddrDebugGame.scene.getScene('Play');
  p.player.sprite.setPosition(p.goalZone.x, p.goalZone.y);
});
await run(1200);
await page.waitForFunction(
  () => window.__ddrDebugGame.scene.getScene('LevelTransition').scene.isActive(),
  null, { timeout: 15000 },
).catch(() => {});
check('corridor interstitial plays', await g("game.scene.getScene('LevelTransition').scene.isActive()"));
check('HUD hides for the cutscene', await page.evaluate(() => document.querySelector('.hud').classList.contains('hud--hidden')));
const captions = await g("game.scene.getScene('LevelTransition').children.list.filter(o=>o.type==='Text').map(o=>o.text)");
check('corridor names both doors', captions.some((t) => t.includes('CLEARED')) && captions.some((t) => t.includes('LEVEL 2')), JSON.stringify(captions.slice(0, 2)));
check('completion message counts down dynamically', captions.some((t) => t.includes('9 MORE TO GO')), captions.find((t) => t.includes('MORE')) ?? '');
await run(1200);
await shot('corridor');

await page.keyboard.press('Space');
await run(800);
await page.waitForFunction(
  () => window.__ddrDebugGame.scene.getScene('Play').level?.id === 'level002',
  null, { timeout: 20000 },
).catch(() => {});
check('advances to the next level', (await g("game.scene.getScene('Play').level?.id")) === 'level002');
check('lives carry across levels', (await hud('lives')) === '3');
check('HUD names the new level', (await hud('level-name')) === 'Industrial Ruins');
check('key gate re-arms on the new level', (await page.locator('[data-hud="key"]').getAttribute('data-key-state')) === 'required');

// ---------------------------------------------------------------- DEATH & LIVES
const deathLevel = await g("game.scene.getScene('Play').level.id");

/** Drops the player out of the world and waits for the run to actually react. */
async function loseALife() {
  const before = Number(await hud('lives'));
  await page.evaluate(() => {
    const p = window.__ddrDebugGame.scene.getScene('Play');
    p.player.sprite.setPosition(p.player.sprite.x, p.level.heightPx + 400);
  });
  for (let i = 0; i < 30; i++) {
    await run(300);
    if ((await page.locator('[data-gameover="retry"]').count()) > 0) return 'gameover';
    if (Number(await hud('lives')) < before) break;
  }
  // Two clocks now matter: the life-lost card runs on a real timer, while game:over is fired
  // by a scene timer that only advances when the loop runs. Drive both.
  for (let i = 0; i < 30; i++) {
    await run(250);
    await wait(200);
    if ((await page.locator('[data-gameover="retry"]').count()) > 0) return 'gameover';
    if (await g("game.scene.getScene('Play').scene.isActive()")) {
      await run(700); // let the restarted level settle before it can be killed again
      return 'lost';
    }
  }
  return 'stuck';
}

const first = await loseALife();
check('a death costs exactly one life', (await hud('lives')) === '2', `lives=${await hud('lives')} (${first})`);
check('death restarts the SAME level, not level 1', (await g("game.scene.getScene('Play').level?.id")) === deathLevel, `level=${await g("game.scene.getScene('Play').level?.id")}`);

let outcome = first;
console.log('   after death 1: lives =', await hud('lives'), 'outcome =', outcome);
for (let i = 0; i < 4 && outcome !== 'gameover'; i++) {
  outcome = await loseALife();
  console.log('   after death ' + (i + 2) + ': lives =', await hud('lives'), 'outcome =', outcome,
    'sceneLives =', await g("game.scene.getScene('Play').livesState?.lives"));
}

const goVisible = await page.locator('[data-gameover="retry"]').count();
check('game over appears when lives run out', goVisible === 1, `outcome=${outcome}`);
if (goVisible) {
  const goLives = (await page.locator('[data-gameover="lives"]').textContent())?.trim();
  // Rendered as three empty pips plus a caption, so assert the meaning, not an exact string.
  check('game over shows zero lives', /LIVES:\s*0/.test(goLives ?? '') && !(goLives ?? '').includes('♥'), `lives=${JSON.stringify(goLives)}`);
  const reached = (await page.locator('[data-gameover="level-reached"]').textContent())?.trim();
  check('game over reports the level reached', !!reached, `reached=${reached}`);
  await shot('game-over');
  await page.locator('[data-gameover="retry"]').click();
  await wait(2500);
  await run(400);
  check('try again restarts at level 1', (await g("game.scene.getScene('Play').level?.id")) === 'level001');
  check('try again restores three lives', (await hud('lives')) === '3');
}

// ---------------------------------------------------------------- PROGRESS SAVED
const save = await page.evaluate(() => JSON.parse(localStorage.getItem('ddr:save:v1') ?? 'null'));
check('progress persists to local storage', !!save && save.levels?.level002?.unlocked === true, save ? `level002 unlocked=${save.levels?.level002?.unlocked}` : 'no save');

// ---------------------------------------------------------------- QUIT TO MENU
try {
  const overlay = await page.evaluate(() => {
    const el = document.querySelector('.screen--overlay');
    return el ? { cls: el.className, text: el.textContent.trim().slice(0, 90) } : null;
  });
  if (overlay) console.log('   NOTE: overlay present before quit:', JSON.stringify(overlay));
  check('no overlay is left covering the game after Try Again', overlay === null, overlay ? overlay.text : '');

  await page.locator('[data-hud="pause-button"]').click({ timeout: 8000 });
  await wait(700);
  await page.locator('[data-pause="exit"]').click({ timeout: 8000 });
  await wait(1500);
  await run(400);
  check('quit returns to the main menu', await page.locator('[data-menu="play"]').isVisible());
  check('HUD is hidden on the menu', await page.evaluate(() => document.querySelector('.hud').classList.contains('hud--hidden')));
} catch (err) {
  check('quit returns to the main menu', false, String(err).slice(0, 110));
}

// ---------------------------------------------------------------- SUMMARY
check('no console or page errors during the whole run', errors.length === 0, errors.slice(0, 3).join(' | '));

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log('FAILURES:');
  for (const f of failed) console.log(`  - ${f.name} ${f.detail}`);
}
await browser.close();
process.exit(failed.length ? 1 : 0);
