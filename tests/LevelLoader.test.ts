import { describe, it, expect } from 'vitest';
import { LevelLoader } from '../src/game/levels/LevelLoader';
import type { LevelData } from '../src/game/levels/types';

const validLevel: LevelData = {
  id: 'level001',
  name: 'Training Grounds',
  widthPx: 1000,
  heightPx: 540,
  parTimeSeconds: 60,
  playerStart: { x: 50, y: 400 },
  groundY: 500,
  platforms: [{ x: 0, y: 500, width: 1000, height: 40 }],
  movingPlatforms: [],
  hazards: [],
  enemies: [],
  collectibles: [{ x: 200, y: 460, kind: 'gem' }],
  checkpoints: [{ id: 'cp1', x: 500, y: 460 }],
  goal: { x: 950, y: 460 },
  backgroundPalette: 'training',
};

describe('LevelLoader.parse', () => {
  it('accepts a well-formed level object', () => {
    expect(() => LevelLoader.parse(validLevel)).not.toThrow();
    expect(LevelLoader.parse(validLevel).id).toBe('level001');
  });

  it('rejects a level missing required fields', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { platforms: _platforms, ...broken } = validLevel;
    expect(() => LevelLoader.parse(broken)).toThrow(/platforms/);
  });

  it('rejects a level with no goal', () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { goal: _goal, ...broken } = validLevel;
    expect(() => LevelLoader.parse(broken)).toThrow(/goal/);
  });
});
