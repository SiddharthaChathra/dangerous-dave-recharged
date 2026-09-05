import type { LevelData } from './types';

export const level004: LevelData = {
  id: 'level004',
  name: 'Sky Fortress',
  widthPx: 3200,
  heightPx: 800,
  parTimeSeconds: 120,
  playerStart: { x: 60, y: 700 },
  groundY: 760,
  platforms: [
    // Start ground
    { x: 0, y: 760, width: 300, height: 40 },
    // Ascending platforms (verticality)
    { x: 350, y: 680, width: 120, height: 24 },
    { x: 550, y: 580, width: 120, height: 24 },
    { x: 350, y: 480, width: 120, height: 24 },
    { x: 550, y: 380, width: 120, height: 24 },
    // Upper walkway
    { x: 720, y: 320, width: 400, height: 24 },
    // Drop down section
    { x: 1200, y: 450, width: 140, height: 24 },
    { x: 1400, y: 560, width: 140, height: 24 },
    // Mid-level bridge
    { x: 1600, y: 480, width: 300, height: 24 },
    // Second ascent
    { x: 1980, y: 380, width: 120, height: 24 },
    { x: 2160, y: 280, width: 120, height: 24 },
    { x: 2340, y: 200, width: 200, height: 24 },
    // High road to exit
    { x: 2600, y: 280, width: 160, height: 24 },
    { x: 2820, y: 380, width: 120, height: 24 },
    // Final ground
    { x: 3000, y: 760, width: 200, height: 40 },
  ],
  movingPlatforms: [
    { x: 200, y: 580, width: 100, height: 20, rangePx: 80, speedPxPerSec: 50 },
    { x: 1100, y: 320, width: 80, height: 20, rangePx: 60, speedPxPerSec: 80 },
    { x: 2500, y: 200, width: 80, height: 20, rangePx: 100, speedPxPerSec: 100 },
  ],
  fallingPlatforms: [
    { x: 1300, y: 350, width: 100, height: 20, fallDelayMs: 400 },
    { x: 2700, y: 300, width: 80, height: 20, fallDelayMs: 350 },
  ],
  hazards: [
    { x: 780, y: 300, width: 32, height: 20, kind: 'spike' },
    { x: 860, y: 300, width: 32, height: 20, kind: 'spike' },
    { x: 1650, y: 460, width: 32, height: 20, kind: 'spike' },
    { x: 1750, y: 460, width: 32, height: 20, kind: 'spike' },
    { x: 2380, y: 180, width: 32, height: 20, kind: 'spike' },
  ],
  enemies: [
    { kind: 'patrol', x: 900, y: 288, rangePx: 100 },
    { kind: 'flying', x: 1300, y: 250, rangePx: 100 },
    { kind: 'chase', x: 1700, y: 448, rangePx: 0 },
    { kind: 'flying', x: 2100, y: 180, rangePx: 80 },
    { kind: 'patrol', x: 2400, y: 168, rangePx: 80 },
  ],
  collectibles: [
    { x: 400, y: 640, kind: 'gem' },
    { x: 600, y: 540, kind: 'gem' },
    { x: 400, y: 440, kind: 'gem' },
    { x: 600, y: 340, kind: 'gem' },
    { x: 850, y: 280, kind: 'gem' },
    { x: 1250, y: 410, kind: 'gem' },
    { x: 1450, y: 520, kind: 'gem' },
    { x: 1700, y: 440, kind: 'gem' },
    { x: 2050, y: 340, kind: 'gem' },
    { x: 2230, y: 240, kind: 'gem' },
    // Secrets hidden on hard-to-reach spots
    { x: 2400, y: 160, kind: 'secret' },
    { x: 750, y: 250, kind: 'secret' },
  ],
  checkpoints: [
    { id: 'level004-cp1', x: 800, y: 280 },
    { id: 'level004-cp2', x: 1650, y: 440 },
    { id: 'level004-cp3', x: 2400, y: 160 },
  ],
  goal: { x: 3140, y: 720 },
  backgroundPalette: 'sky',
};
