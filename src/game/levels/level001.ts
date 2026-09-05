import type { LevelData } from './types';

export const level001: LevelData = {
  id: 'level001',
  name: 'Training Grounds',
  widthPx: 2400,
  heightPx: 540,
  parTimeSeconds: 75,
  playerStart: { x: 60, y: 400 },
  groundY: 500,
  platforms: [
    { x: 0, y: 500, width: 700, height: 40 },
    { x: 820, y: 500, width: 300, height: 40 }, // gap at 700-820 teaches basic jump
    { x: 1250, y: 420, width: 160, height: 24 }, // raised platform
    { x: 1500, y: 500, width: 900, height: 40 },
  ],
  movingPlatforms: [],
  hazards: [
    { x: 1700, y: 480, width: 32, height: 20, kind: 'spike' },
    { x: 1900, y: 480, width: 32, height: 20, kind: 'spike' },
  ],
  enemies: [{ kind: 'patrol', x: 2100, y: 468, rangePx: 120 }],
  collectibles: [
    { x: 300, y: 460, kind: 'gem' },
    { x: 500, y: 460, kind: 'gem' },
    { x: 900, y: 460, kind: 'gem' },
    { x: 1290, y: 380, kind: 'gem' },
    { x: 1600, y: 460, kind: 'gem' },
    { x: 1320, y: 380, kind: 'secret' },
  ],
  checkpoints: [{ id: 'level001-cp1', x: 1000, y: 460 }],
  goal: { x: 2340, y: 460 },
  backgroundPalette: 'training',
};
