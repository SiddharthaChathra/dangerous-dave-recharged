import type { LevelData } from './types';

/**
 * Level 9 — "Needlepoint".
 *
 * Precision platforming: narrow ledges with tight spacing over open drops. Jumps are sized
 * to demand accuracy but stay inside the verified reach model — never a frame-perfect maximum.
 * Enemy count is lower than level 8 on purpose; here the *geometry* is the opponent.
 */
export const level009: LevelData = {
  id: 'level009',
  name: 'Needlepoint',
  widthPx: 3600,
  heightPx: 820,
  parTimeSeconds: 175,
  playerStart: { x: 60, y: 700 },
  groundY: 780,
  platforms: [
    { x: 0, y: 780, width: 300, height: 40 },
    // Narrow ascending needles
    { x: 400, y: 700, width: 70, height: 20 },
    { x: 560, y: 620, width: 70, height: 20 },
    { x: 720, y: 560, width: 70, height: 20 },
    { x: 880, y: 500, width: 70, height: 20 },
    // Brief landing — the level's only real breather
    { x: 1040, y: 480, width: 200, height: 24 },
    // Descending needles over a drop
    { x: 1340, y: 540, width: 70, height: 20 },
    { x: 1500, y: 600, width: 70, height: 20 },
    { x: 1660, y: 660, width: 70, height: 20 },
    // Spiked floor crossing
    { x: 1820, y: 780, width: 560, height: 40 },
    // Final ascent, alternating sides
    { x: 2480, y: 700, width: 80, height: 20 },
    { x: 2650, y: 620, width: 80, height: 20 },
    { x: 2820, y: 540, width: 80, height: 20 },
    { x: 2990, y: 460, width: 80, height: 20 },
    { x: 3160, y: 400, width: 100, height: 20 },
    { x: 3340, y: 460, width: 260, height: 40 },
  ],
  movingPlatforms: [
    { x: 1260, y: 620, width: 80, height: 20, rangePx: 90, speedPxPerSec: 130 },
    { x: 2400, y: 660, width: 80, height: 20, rangePx: 80, speedPxPerSec: 135 },
    { x: 3060, y: 380, width: 70, height: 20, rangePx: 60, speedPxPerSec: 140 },
  ],
  fallingPlatforms: [
    { x: 640, y: 600, width: 60, height: 20, fallDelayMs: 240 },
    { x: 1440, y: 520, width: 60, height: 20, fallDelayMs: 220 },
    { x: 2740, y: 580, width: 60, height: 20, fallDelayMs: 220 },
    { x: 3080, y: 440, width: 60, height: 20, fallDelayMs: 200 },
  ],
  hazards: [
    { x: 1900, y: 760, width: 32, height: 20, kind: 'lava' },
    { x: 1980, y: 760, width: 32, height: 20, kind: 'fire' },
    { x: 2060, y: 760, width: 32, height: 20, kind: 'spike' },
    { x: 2140, y: 760, width: 32, height: 20, kind: 'fire' },
    { x: 2220, y: 760, width: 32, height: 20, kind: 'lava' },
    { x: 2300, y: 760, width: 32, height: 20, kind: 'spike' },
    { x: 1080, y: 460, width: 32, height: 20, kind: 'lava' },
    { x: 3200, y: 380, width: 32, height: 20, kind: 'fire' },
  ],
  enemies: [
    { kind: 'flying', x: 640, y: 540, rangePx: 100 },
    { kind: 'chase', x: 1140, y: 448, rangePx: 0 },
    { kind: 'flying', x: 1560, y: 520, rangePx: 110 },
    { kind: 'patrol', x: 2100, y: 748, rangePx: 220 },
    { kind: 'flying', x: 2700, y: 480, rangePx: 100 },
    { kind: 'chase', x: 3200, y: 368, rangePx: 0 },
  ],
  collectibles: [
    { x: 180, y: 740, kind: 'gem' },
    { x: 435, y: 660, kind: 'gem' },
    { x: 595, y: 580, kind: 'gem' },
    { x: 755, y: 520, kind: 'gem' },
    { x: 915, y: 460, kind: 'gem' },
    { x: 1140, y: 440, kind: 'gem' },
    
    { x: 1695, y: 620, kind: 'gem' },
    { x: 2515, y: 660, kind: 'gem' },
    { x: 2855, y: 500, kind: 'gem' },
    { x: 3025, y: 420, kind: 'gem' },
    { x: 3440, y: 420, kind: 'gem' },
    // Perched on the highest needle before the finish.
    { x: 3210, y: 360, kind: 'secret' },
  ],
  weaponPickups: [{ x: 220, y: 742 }],
  // Collect this before the exit door will open.
  trophy: { x: 1375, y: 500 },
  goal: { x: 3540, y: 420 },
  backgroundPalette: 'neon',
};
