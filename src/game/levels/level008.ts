import type { LevelData } from './types';

/**
 * Level 8 — "Sentry Shafts".
 *
 * Combination pressure: flying sentries patrol the airspace directly above the ledges the
 * player must land on, so every jump is also a timing read. Landings stay reasonably wide —
 * the threat is what is *waiting* on them.
 */
export const level008: LevelData = {
  id: 'level008',
  name: 'Sentry Shafts',
  widthPx: 3400,
  heightPx: 820,
  parTimeSeconds: 160,
  playerStart: { x: 60, y: 700 },
  groundY: 780,
  platforms: [
    { x: 0, y: 780, width: 340, height: 40 },
    // Shaft 1 — climb between patrolling sentries
    { x: 440, y: 700, width: 130, height: 24 },
    { x: 660, y: 620, width: 130, height: 24 },
    { x: 880, y: 540, width: 130, height: 24 },
    // Ledge run under sentry fire
    { x: 1100, y: 520, width: 150, height: 24 },
    { x: 1350, y: 540, width: 150, height: 24 },
    { x: 1600, y: 520, width: 150, height: 24 },
    // Drop into the pit floor
    { x: 1860, y: 780, width: 520, height: 40 },
    // Shaft 2 — climb back out
    { x: 2460, y: 700, width: 130, height: 24 },
    { x: 2680, y: 620, width: 130, height: 24 },
    { x: 2900, y: 540, width: 130, height: 24 },
    { x: 3120, y: 620, width: 280, height: 40 },
  ],
  movingPlatforms: [
    { x: 1780, y: 640, width: 90, height: 20, rangePx: 90, speedPxPerSec: 120 },
    { x: 2280, y: 700, width: 90, height: 20, rangePx: 80, speedPxPerSec: 125 },
  ],
  fallingPlatforms: [
    { x: 590, y: 660, width: 60, height: 20, fallDelayMs: 280 },
    { x: 1290, y: 480, width: 60, height: 20, fallDelayMs: 260 },
    { x: 2610, y: 660, width: 60, height: 20, fallDelayMs: 260 },
  ],
  hazards: [
    { x: 360, y: 760, width: 32, height: 20, kind: 'lava' },
    // The pit floor is a spike corridor — crossing it on foot costs a life.
    { x: 1940, y: 760, width: 32, height: 20, kind: 'fire' },
    { x: 2020, y: 760, width: 32, height: 20, kind: 'spike' },
    { x: 2100, y: 760, width: 32, height: 20, kind: 'fire' },
    { x: 2180, y: 760, width: 32, height: 20, kind: 'lava' },
    { x: 2260, y: 760, width: 32, height: 20, kind: 'spike' },
    { x: 1160, y: 500, width: 32, height: 20, kind: 'lava' },
    { x: 1660, y: 500, width: 32, height: 20, kind: 'fire' },
  ],
  enemies: [
    { kind: 'flying', x: 500, y: 640, rangePx: 90 },
    { kind: 'flying', x: 720, y: 560, rangePx: 90 },
    { kind: 'patrol', x: 940, y: 508, rangePx: 60 },
    { kind: 'flying', x: 1200, y: 440, rangePx: 110 },
    { kind: 'chase', x: 1420, y: 508, rangePx: 0 },
    { kind: 'flying', x: 1700, y: 440, rangePx: 110 },
    { kind: 'patrol', x: 2100, y: 748, rangePx: 200 },
    { kind: 'flying', x: 2540, y: 640, rangePx: 90 },
    { kind: 'chase', x: 2960, y: 508, rangePx: 0 },
  ],
  collectibles: [
    { x: 200, y: 740, kind: 'gem' },
    { x: 500, y: 660, kind: 'gem' },
    { x: 720, y: 580, kind: 'gem' },
    { x: 940, y: 500, kind: 'gem' },
    { x: 1160, y: 460, kind: 'gem' },
    
    { x: 1660, y: 460, kind: 'gem' },
    { x: 2520, y: 660, kind: 'gem' },
    { x: 2740, y: 580, kind: 'gem' },
    { x: 2960, y: 500, kind: 'gem' },
    { x: 3220, y: 580, kind: 'gem' },
    // Sitting on the sentry-patrolled ledge run.
    { x: 1440, y: 500, kind: 'secret' },
  ],
  weaponPickups: [{ x: 240, y: 742 }],
  // Collect this before the exit door will open.
  trophy: { x: 1420, y: 500 },
  goal: { x: 3340, y: 580 },
  backgroundPalette: 'sky',
};
