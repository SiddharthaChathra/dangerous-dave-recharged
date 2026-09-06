import type { LevelData } from './types';

/**
 * Level 6 — "Collapsing Foundry".
 *
 * Introduces speed pressure: chasers on open ground and a run of falling platforms that
 * punishes hesitation. Geometry stays generous (wide landings) so the new demand is *timing*,
 * not precision.
 */
export const level006: LevelData = {
  id: 'level006',
  name: 'Collapsing Foundry',
  widthPx: 3200,
  heightPx: 700,
  parTimeSeconds: 135,
  playerStart: { x: 60, y: 560 },
  groundY: 640,
  platforms: [
    { x: 0, y: 640, width: 420, height: 40 },
    // Ascent into the foundry
    { x: 540, y: 560, width: 160, height: 24 },
    { x: 800, y: 480, width: 200, height: 24 },
    // Chase arena — open, wide, nowhere to hide
    { x: 1100, y: 480, width: 460, height: 24 },
    // Collapsing crossing (the falling platforms below bridge this gap)
    { x: 2060, y: 480, width: 180, height: 24 },
    // Descent
    { x: 2340, y: 560, width: 160, height: 24 },
    { x: 2600, y: 640, width: 600, height: 40 },
  ],
  movingPlatforms: [
    { x: 1700, y: 560, width: 90, height: 20, rangePx: 70, speedPxPerSec: 95 },
  ],
  fallingPlatforms: [
    { x: 1640, y: 480, width: 70, height: 20, fallDelayMs: 400 },
    { x: 1810, y: 460, width: 70, height: 20, fallDelayMs: 350 },
    { x: 1960, y: 470, width: 70, height: 20, fallDelayMs: 320 },
  ],
  hazards: [
    { x: 440, y: 620, width: 32, height: 20, kind: 'fire' },
    { x: 1180, y: 460, width: 32, height: 20, kind: 'lava' },
    { x: 1420, y: 460, width: 32, height: 20, kind: 'spike' },
    { x: 2680, y: 620, width: 32, height: 20, kind: 'lava' },
    { x: 2780, y: 620, width: 32, height: 20, kind: 'fire' },
    { x: 2880, y: 620, width: 32, height: 20, kind: 'spike' },
    { x: 1320, y: 460, width: 32, height: 20, kind: 'fire' },
  ],
  enemies: [
    { kind: 'patrol', x: 640, y: 528, rangePx: 60 },
    // Two chasers sharing one arena: the level's signature pressure moment.
    { kind: 'chase', x: 1250, y: 448, rangePx: 0 },
    { kind: 'chase', x: 1480, y: 448, rangePx: 0 },
    { kind: 'flying', x: 1880, y: 400, rangePx: 90 },
    { kind: 'flying', x: 2180, y: 420, rangePx: 80 },
    { kind: 'patrol', x: 2900, y: 608, rangePx: 120 },
  ],
  collectibles: [
    { x: 240, y: 600, kind: 'gem' },
    { x: 600, y: 520, kind: 'gem' },
    { x: 860, y: 440, kind: 'gem' },
    { x: 1300, y: 440, kind: 'gem' },
    
    { x: 2120, y: 440, kind: 'gem' },
    { x: 2400, y: 520, kind: 'gem' },
    { x: 2860, y: 600, kind: 'gem' },
    { x: 3060, y: 600, kind: 'gem' },
    // Reward for crossing the collapsing run without dropping to the safe route below.
    { x: 1880, y: 420, kind: 'secret' },
  ],
  weaponPickups: [{ x: 300, y: 602 }],
  // Collect this before the exit door will open.
  trophy: { x: 1520, y: 440 },
  goal: { x: 3140, y: 600 },
  backgroundPalette: 'factory',
};
