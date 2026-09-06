import type { LevelData } from './types';

export const level003: LevelData = {
  id: 'level003',
  name: 'Neon Caverns',
  widthPx: 3000,
  heightPx: 700,
  parTimeSeconds: 110,
  playerStart: { x: 60, y: 560 },
  groundY: 640,
  platforms: [
    { x: 0, y: 640, width: 400, height: 40 },
    { x: 500, y: 560, width: 200, height: 24 },
    { x: 800, y: 460, width: 200, height: 24 },
    { x: 1100, y: 640, width: 500, height: 40 },
    // Stepping stone: without it the climb out of the mid section needed a 140px rise,
    // taller than the player can jump, leaving the rest of the level unreachable.
    { x: 1680, y: 560, width: 120, height: 24 },
    { x: 1750, y: 500, width: 160, height: 24 },
    { x: 2000, y: 400, width: 200, height: 24 },
    { x: 2300, y: 640, width: 700, height: 40 },
  ],
  movingPlatforms: [{ x: 1650, y: 300, width: 100, height: 20, rangePx: 100, speedPxPerSec: 100 }],
  fallingPlatforms: [],
  hazards: [
    { x: 420, y: 620, width: 32, height: 20, kind: 'fire' },
    { x: 1250, y: 620, width: 32, height: 20, kind: 'fire' },
    { x: 1400, y: 620, width: 32, height: 20, kind: 'spike' },
    { x: 2450, y: 620, width: 32, height: 20, kind: 'fire' },
  ],
  enemies: [
    { kind: 'chase', x: 1300, y: 608, rangePx: 0 },
    { kind: 'flying', x: 1900, y: 260, rangePx: 80 },
    { kind: 'chase', x: 2600, y: 608, rangePx: 0 },
  ],
  collectibles: [
    { x: 200, y: 600, kind: 'gem' },
    { x: 560, y: 520, kind: 'gem' },
    { x: 860, y: 420, kind: 'gem' },
    
    { x: 2050, y: 340, kind: 'gem' },
    { x: 2700, y: 600, kind: 'gem' },
    { x: 2050, y: 300, kind: 'secret' },
  ],
  weaponPickups: [{ x: 240, y: 602 }],
  // Collect this before the exit door will open.
  trophy: { x: 1780, y: 460 },
  goal: { x: 2960, y: 600 },
  backgroundPalette: 'neon',
};
