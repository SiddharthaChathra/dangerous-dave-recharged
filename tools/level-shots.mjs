/**
 * Captures one screenshot per level so each level's visual identity can be compared
 * side by side. Levels 2-5 are locked in the menu, so this drives PlayScene directly
 * through the debug game handle rather than through the UI.
 *
 * Usage: node tools/level-shots.mjs [baseUrl] [outDir]
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

const BASE = process.argv[2] || 'http://localhost:5173';
const OUT = process.argv[3] || 'qa-shots/levels';
const LEVELS = ['level001', 'level002', 'level003', 'level004', 'level005'];

mkdirSync(OUT, { recursive: true });

const server = spawn('npm', ['run', 'dev', '--', '--port', '5173'], {
  shell: true,
  stdio: 'ignore',
});
process.on('exit', () => server.kill());

// Wait for the dev server to answer before driving it.
for (let i = 0; i < 60; i++) {
  try {
    const res = await fetch(BASE);
    if (res.ok) break;
  } catch {
    /* not up yet */
  }
  await sleep(500);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });

// Unlock every level up front so each one can be entered through the real menu path.
// Driving scene.restart() directly bypasses main.ts, which is what emits `game:started`
// — the HUD would then show a stale level name that real play never produces.
await page.addInitScript((levels) => {
  const entries = Object.fromEntries(
    levels.map((id) => [id, { bestScore: 0, bestTimeSeconds: null, unlocked: true }]),
  );
  window.localStorage.setItem(
    'ddr:save:v1',
    JSON.stringify({
      version: 1,
      highScore: 0,
      levels: entries,
      settings: {
        musicVolume: 0.6,
        sfxVolume: 0.8,
        muted: true,
        theme: 'dark',
        reducedMotion: false,
      },
    }),
  );
}, LEVELS);

for (const levelId of LEVELS) {
  // Fresh load per level: entering a level tears down the menu, so there is no card
  // left to click for the next one.
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await sleep(1500);
  await page.evaluate((id) => {
    document.querySelector(`.level-card[data-level="${id}"]`)?.click();
  }, levelId);
  await sleep(1800);
  // Nudge the player right so the frame shows motion, not a spawn pose.
  await page.keyboard.down('ArrowRight');
  await sleep(1200);
  await page.screenshot({ path: `${OUT}/${levelId}.png` });
  await page.keyboard.up('ArrowRight');
}

await browser.close();
server.kill();
console.log(`wrote ${LEVELS.length} shots to ${OUT}`);
process.exit(0);
