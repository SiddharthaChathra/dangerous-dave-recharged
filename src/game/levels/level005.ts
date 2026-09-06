import type { LevelData } from './types';

export const level005: LevelData = {
  id: 'level005',
  name: 'The Gauntlet',
  widthPx: 3600,
  heightPx: 800,
  parTimeSeconds: 150,
  playerStart: { x: 60, y: 700 },
  groundY: 760,
  platforms: [
    // Start platform
    { x: 0, y: 760, width: 200, height: 40 },
    // Gauntlet section 1 — precision jumps
    { x: 300, y: 700, width: 80, height: 24 },
    { x: 460, y: 640, width: 80, height: 24 },
    { x: 620, y: 580, width: 80, height: 24 },
    { x: 780, y: 520, width: 80, height: 24 },
    // Elevated combat arena
    { x: 920, y: 520, width: 400, height: 24 },
    // Descent into danger zone
    { x: 1400, y: 600, width: 120, height: 24 },
    { x: 1580, y: 680, width: 120, height: 24 },
    { x: 1580, y: 760, width: 300, height: 40 },
    // Spike run
    { x: 1940, y: 760, width: 600, height: 40 },
    // Vertical tower
    { x: 2600, y: 680, width: 100, height: 24 },
    { x: 2760, y: 580, width: 100, height: 24 },
    { x: 2600, y: 480, width: 100, height: 24 },
    { x: 2760, y: 380, width: 100, height: 24 },
    { x: 2600, y: 280, width: 100, height: 24 },
    // Final run
    { x: 2800, y: 280, width: 200, height: 24 },
    { x: 3100, y: 360, width: 120, height: 24 },
    { x: 3300, y: 760, width: 300, height: 40 },
  ],
  movingPlatforms: [
    { x: 1350, y: 520, width: 80, height: 20, rangePx: 60, speedPxPerSec: 90 },
    { x: 2550, y: 380, width: 60, height: 20, rangePx: 50, speedPxPerSec: 110 },
    { x: 3050, y: 280, width: 60, height: 20, rangePx: 40, speedPxPerSec: 120 },
  ],
  fallingPlatforms: [
    { x: 500, y: 640, width: 60, height: 20, fallDelayMs: 300 },
    { x: 1500, y: 600, width: 60, height: 20, fallDelayMs: 350 },
    { x: 2700, y: 480, width: 60, height: 20, fallDelayMs: 250 },
  ],
  hazards: [
    // Spike run gauntlet
    { x: 2000, y: 740, width: 32, height: 20, kind: 'fire' },
    { x: 2080, y: 740, width: 32, height: 20, kind: 'lava' },
    { x: 2160, y: 740, width: 32, height: 20, kind: 'spike' },
    { x: 2240, y: 740, width: 32, height: 20, kind: 'lava' },
    // Additional hazards
    { x: 1000, y: 500, width: 32, height: 20, kind: 'fire' },
    { x: 1100, y: 500, width: 32, height: 20, kind: 'spike' },
    { x: 2850, y: 260, width: 32, height: 20, kind: 'fire' },
  ],
  enemies: [
    // Combat arena guards
    { kind: 'patrol', x: 1050, y: 488, rangePx: 120 },
    { kind: 'chase', x: 1200, y: 488, rangePx: 0 },
    // Flying sentries
    { kind: 'flying', x: 1450, y: 460, rangePx: 100 },
    { kind: 'flying', x: 2200, y: 600, rangePx: 80 },
    // Tower guardians
    { kind: 'chase', x: 2650, y: 448, rangePx: 0 },
    { kind: 'patrol', x: 2810, y: 348, rangePx: 60 },
    // Final approach
    { kind: 'chase', x: 3150, y: 328, rangePx: 0 },
  ],
  collectibles: [
    { x: 340, y: 660, kind: 'gem' },
    { x: 500, y: 600, kind: 'gem' },
    { x: 660, y: 540, kind: 'gem' },
    { x: 820, y: 480, kind: 'gem' },
    { x: 1000, y: 480, kind: 'gem' },
    { x: 1150, y: 480, kind: 'gem' },
    { x: 1650, y: 640, kind: 'gem' },
    
    { x: 2300, y: 720, kind: 'gem' },
    { x: 2650, y: 640, kind: 'gem' },
    { x: 2810, y: 540, kind: 'gem' },
    { x: 2650, y: 440, kind: 'gem' },
    { x: 2810, y: 340, kind: 'gem' },
    { x: 2650, y: 240, kind: 'gem' },
    // Secrets
    { x: 1250, y: 460, kind: 'secret' },
    { x: 2900, y: 240, kind: 'secret' },
  ],
  weaponPickups: [{ x: 240, y: 722 }],
  // Collect this before the exit door will open.
  key: { x: 2100, y: 720 },
  goal: { x: 3540, y: 720 },
  backgroundPalette: 'final',
};
