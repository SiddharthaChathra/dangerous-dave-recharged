import type { LevelData } from './types';

/**
 * Level 7 — "The High Road".
 *
 * Built around risk/reward: a safe low route runs the whole length of the level, and a harder
 * elevated route carries the gems, the secret and a shortcut. Both reach the exit, so the
 * difficulty is a choice the player makes rather than a wall.
 */
export const level007: LevelData = {
  id: 'level007',
  name: 'The High Road',
  widthPx: 3400,
  heightPx: 760,
  parTimeSeconds: 150,
  playerStart: { x: 60, y: 620 },
  groundY: 700,
  platforms: [
    // --- Low route: slower, hazardous, but always available ---
    { x: 0, y: 700, width: 700, height: 40 },
    { x: 820, y: 700, width: 520, height: 40 },
    { x: 1460, y: 700, width: 560, height: 40 },
    { x: 2140, y: 700, width: 480, height: 40 },
    { x: 2740, y: 700, width: 660, height: 40 },
    // --- High route: staircase up, then a run of narrow ledges ---
    { x: 300, y: 620, width: 140, height: 24 },
    { x: 540, y: 540, width: 140, height: 24 },
    { x: 780, y: 460, width: 140, height: 24 },
    { x: 1020, y: 440, width: 120, height: 24 },
    { x: 1240, y: 440, width: 120, height: 24 },
    { x: 1460, y: 460, width: 120, height: 24 },
    { x: 1680, y: 440, width: 120, height: 24 },
    { x: 1900, y: 460, width: 120, height: 24 },
    // Elevated vault holding the secret
    { x: 2120, y: 400, width: 220, height: 24 },
    // Rejoin the ground
    { x: 2460, y: 500, width: 140, height: 24 },
    { x: 2680, y: 600, width: 140, height: 24 },
  ],
  movingPlatforms: [
    { x: 1140, y: 560, width: 90, height: 20, rangePx: 80, speedPxPerSec: 100 },
    { x: 2400, y: 620, width: 90, height: 20, rangePx: 70, speedPxPerSec: 115 },
  ],
  fallingPlatforms: [
    { x: 1810, y: 400, width: 70, height: 20, fallDelayMs: 300 },
    { x: 2380, y: 440, width: 70, height: 20, fallDelayMs: 280 },
  ],
  hazards: [
    // The low route is safe but studded with spikes — cheaper, not free.
    { x: 900, y: 680, width: 32, height: 20, kind: 'lava' },
    { x: 1000, y: 680, width: 32, height: 20, kind: 'fire' },
    { x: 1560, y: 680, width: 32, height: 20, kind: 'spike' },
    { x: 1660, y: 680, width: 32, height: 20, kind: 'fire' },
    { x: 1760, y: 680, width: 32, height: 20, kind: 'lava' },
    { x: 2240, y: 680, width: 32, height: 20, kind: 'spike' },
    { x: 2340, y: 680, width: 32, height: 20, kind: 'lava' },
    { x: 2900, y: 680, width: 32, height: 20, kind: 'fire' },
  ],
  enemies: [
    { kind: 'patrol', x: 1000, y: 668, rangePx: 140 },
    { kind: 'flying', x: 1360, y: 380, rangePx: 80 },
    { kind: 'patrol', x: 1780, y: 668, rangePx: 160 },
    { kind: 'chase', x: 2200, y: 368, rangePx: 0 },
    { kind: 'flying', x: 2600, y: 560, rangePx: 100 },
    { kind: 'patrol', x: 3100, y: 668, rangePx: 180 },
  ],
  collectibles: [
    { x: 200, y: 660, kind: 'gem' },
    { x: 360, y: 580, kind: 'gem' },
    { x: 600, y: 500, kind: 'gem' },
    { x: 840, y: 420, kind: 'gem' },
    { x: 1080, y: 400, kind: 'gem' },
    
    { x: 1740, y: 400, kind: 'gem' },
    { x: 1960, y: 420, kind: 'gem' },
    { x: 2200, y: 360, kind: 'gem' },
    { x: 2520, y: 460, kind: 'gem' },
    { x: 3000, y: 660, kind: 'gem' },
    // Only reachable from the high route's vault.
    { x: 2280, y: 360, kind: 'secret' },
  ],
  weaponPickups: [{ x: 460, y: 662 }],
  // Collect this before the exit door will open.
  key: { x: 1300, y: 400 },
  goal: { x: 3320, y: 660 },
  backgroundPalette: 'neon',
};
