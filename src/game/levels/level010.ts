import type { LevelData } from './types';

/**
 * Level 10 — "Dave's Last Stand".
 *
 * The finale, assembled from everything the campaign taught: a collapsing run (L6), a
 * risk/reward split (L7), a sentry-patrolled climb (L8) and a precision gauntlet (L9), ending
 * in a long spiked approach to the exit. Nothing new is introduced — this is the exam.
 */
export const level010: LevelData = {
  id: 'level010',
  name: "Dave's Last Stand",
  widthPx: 4000,
  heightPx: 860,
  parTimeSeconds: 210,
  playerStart: { x: 60, y: 740 },
  groundY: 820,
  platforms: [
    { x: 0, y: 820, width: 320, height: 40 },
    // Act 1 — collapsing crossing (callback to level 6)
    { x: 420, y: 740, width: 120, height: 24 },
    { x: 900, y: 720, width: 160, height: 24 },
    // Act 2 — the split: high gem route vs low safe route
    { x: 1160, y: 640, width: 120, height: 24 },
    { x: 1380, y: 560, width: 120, height: 24 },
    { x: 1600, y: 500, width: 160, height: 24 },
    { x: 1160, y: 820, width: 700, height: 40 },
    // Act 3 — sentry climb (callback to level 8)
    { x: 1960, y: 740, width: 110, height: 24 },
    { x: 2160, y: 660, width: 110, height: 24 },
    { x: 2360, y: 580, width: 110, height: 24 },
    { x: 2560, y: 500, width: 160, height: 24 },
    // Act 4 — precision needles over the spiked floor (callback to level 9)
    { x: 2820, y: 560, width: 70, height: 20 },
    { x: 2980, y: 620, width: 70, height: 20 },
    { x: 3140, y: 680, width: 70, height: 20 },
    { x: 3300, y: 820, width: 700, height: 40 },
  ],
  movingPlatforms: [
    { x: 640, y: 700, width: 90, height: 20, rangePx: 100, speedPxPerSec: 120 },
    { x: 1840, y: 620, width: 80, height: 20, rangePx: 90, speedPxPerSec: 130 },
    { x: 2740, y: 460, width: 80, height: 20, rangePx: 70, speedPxPerSec: 140 },
  ],
  fallingPlatforms: [
    { x: 560, y: 700, width: 60, height: 20, fallDelayMs: 260 },
    { x: 780, y: 700, width: 60, height: 20, fallDelayMs: 240 },
    { x: 1500, y: 500, width: 60, height: 20, fallDelayMs: 220 },
    { x: 2260, y: 620, width: 60, height: 20, fallDelayMs: 220 },
    { x: 3060, y: 600, width: 60, height: 20, fallDelayMs: 200 },
  ],
  hazards: [
    { x: 340, y: 800, width: 32, height: 20, kind: 'lava' },
    // Low route through act 2 — survivable, but it costs you the gems above.
    { x: 1240, y: 800, width: 32, height: 20, kind: 'fire' },
    { x: 1340, y: 800, width: 32, height: 20, kind: 'spike' },
    { x: 1440, y: 800, width: 32, height: 20, kind: 'fire' },
    { x: 1560, y: 800, width: 32, height: 20, kind: 'lava' },
    { x: 1680, y: 800, width: 32, height: 20, kind: 'spike' },
    // Final approach
    { x: 3380, y: 800, width: 32, height: 20, kind: 'lava' },
    { x: 3480, y: 800, width: 32, height: 20, kind: 'fire' },
    { x: 3580, y: 800, width: 32, height: 20, kind: 'spike' },
    { x: 3680, y: 800, width: 32, height: 20, kind: 'fire' },
    { x: 2600, y: 480, width: 32, height: 20, kind: 'lava' },
  ],
  enemies: [
    { kind: 'patrol', x: 200, y: 788, rangePx: 100 },
    { kind: 'flying', x: 700, y: 620, rangePx: 110 },
    { kind: 'chase', x: 980, y: 688, rangePx: 0 },
    { kind: 'flying', x: 1420, y: 480, rangePx: 100 },
    { kind: 'patrol', x: 1500, y: 788, rangePx: 240 },
    { kind: 'flying', x: 2040, y: 660, rangePx: 100 },
    { kind: 'chase', x: 2420, y: 548, rangePx: 0 },
    { kind: 'flying', x: 2640, y: 420, rangePx: 100 },
    { kind: 'chase', x: 2860, y: 528, rangePx: 0 },
    { kind: 'patrol', x: 3600, y: 788, rangePx: 260 },
    { kind: 'flying', x: 3800, y: 700, rangePx: 120 },
  ],
  collectibles: [
    { x: 180, y: 780, kind: 'gem' },
    { x: 460, y: 700, kind: 'gem' },
    { x: 960, y: 680, kind: 'gem' },
    { x: 1200, y: 600, kind: 'gem' },
    { x: 1420, y: 520, kind: 'gem' },
    { x: 1660, y: 460, kind: 'gem' },
    { x: 2000, y: 700, kind: 'gem' },
    
    { x: 2400, y: 540, kind: 'gem' },
    { x: 2620, y: 460, kind: 'gem' },
    { x: 2855, y: 520, kind: 'gem' },
    { x: 3015, y: 580, kind: 'gem' },
    { x: 3175, y: 640, kind: 'gem' },
    { x: 3800, y: 780, kind: 'gem' },
    // Two secrets: one on each of act 2's routes' highest point, one past the last gauntlet.
    { x: 1700, y: 460, kind: 'secret' },
    { x: 2660, y: 460, kind: 'secret' },
  ],
  weaponPickups: [{ x: 260, y: 782 }],
  // Collect this before the exit door will open.
  key: { x: 2200, y: 620 },
  goal: { x: 3940, y: 780 },
  backgroundPalette: 'final',
};
