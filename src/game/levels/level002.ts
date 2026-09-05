import type { LevelData } from './types';

export const level002: LevelData = {
  id: 'level002',
  name: 'Industrial Ruins',
  widthPx: 2800,
  heightPx: 540,
  parTimeSeconds: 90,
  playerStart: { x: 60, y: 400 },
  groundY: 500,
  platforms: [
    { x: 0, y: 500, width: 500, height: 40 },
    { x: 700, y: 500, width: 400, height: 40 },
    { x: 1900, y: 500, width: 900, height: 40 },
  ],
  movingPlatforms: [
    { x: 550, y: 440, width: 100, height: 20, rangePx: 90, speedPxPerSec: 70 },
    { x: 1400, y: 380, width: 100, height: 20, rangePx: 140, speedPxPerSec: 90 },
  ],
  fallingPlatforms: [{ x: 1150, y: 460, width: 120, height: 20, fallDelayMs: 500 }],
  hazards: [
    { x: 780, y: 480, width: 32, height: 20, kind: 'spike' },
    { x: 2000, y: 480, width: 32, height: 20, kind: 'spike' },
    { x: 2200, y: 480, width: 32, height: 20, kind: 'spike' },
  ],
  enemies: [
    { kind: 'patrol', x: 900, y: 468, rangePx: 150 },
    { kind: 'flying', x: 1300, y: 300, rangePx: 60 },
    { kind: 'patrol', x: 2400, y: 468, rangePx: 180 },
  ],
  collectibles: [
    { x: 200, y: 460, kind: 'gem' },
    { x: 750, y: 460, kind: 'gem' },
    { x: 1180, y: 420, kind: 'gem' },
    { x: 1420, y: 340, kind: 'gem' },
    { x: 2100, y: 460, kind: 'gem' },
    { x: 2600, y: 460, kind: 'gem' },
    { x: 1440, y: 340, kind: 'secret' },
  ],
  checkpoints: [
    { id: 'level002-cp1', x: 1000, y: 460 },
    { id: 'level002-cp2', x: 1950, y: 460 },
  ],
  goal: { x: 2740, y: 460 },
  backgroundPalette: 'industrial',
};
