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
    { x: 1750, y: 500, width: 160, height: 24 },
    { x: 2000, y: 380, width: 160, height: 24 },
    { x: 2300, y: 640, width: 700, height: 40 },
  ],
  movingPlatforms: [{ x: 1650, y: 300, width: 100, height: 20, rangePx: 100, speedPxPerSec: 100 }],
  fallingPlatforms: [],
  hazards: [
    { x: 420, y: 620, width: 32, height: 20, kind: 'spike' },
    { x: 1250, y: 620, width: 32, height: 20, kind: 'spike' },
    { x: 1400, y: 620, width: 32, height: 20, kind: 'spike' },
    { x: 2450, y: 620, width: 32, height: 20, kind: 'spike' },
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
    { x: 1780, y: 460, kind: 'gem' },
    { x: 2050, y: 340, kind: 'gem' },
    { x: 2700, y: 600, kind: 'gem' },
    { x: 2050, y: 300, kind: 'secret' },
  ],
  checkpoints: [
    { id: 'level003-cp1', x: 1150, y: 600 },
    { id: 'level003-cp2', x: 2320, y: 600 },
  ],
  goal: { x: 2960, y: 600 },
  backgroundPalette: 'neon',
};
