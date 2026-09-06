import { describe, it, expect } from 'vitest';
import { LEVELS, LEVEL_ORDER } from '../src/game/levels/registry';
import { canReach, validateLevel, difficultyScore, JUMP_LIMITS, type Surface } from '../src/utils/levelValidation';

const surface = (x1: number, x2: number, y: number, label = 's'): Surface => ({ x1, x2, y, label });

describe('canReach', () => {
  it('allows a short hop up onto a nearby ledge', () => {
    expect(canReach(surface(0, 100, 500), surface(180, 280, 460))).toBe(true);
  });

  it('rejects a rise beyond the player\'s jump height', () => {
    // Max jump is 112px; anything above the limit is simply not clearable.
    expect(canReach(surface(0, 100, 500), surface(120, 220, 380))).toBe(false);
  });

  it('rejects a gap wider than the player can cross', () => {
    expect(canReach(surface(0, 100, 500), surface(400, 500, 500))).toBe(false);
  });

  it('allows a longer gap when dropping, since falling buys airtime', () => {
    expect(canReach(surface(0, 100, 300), surface(280, 380, 500))).toBe(true);
  });

  it('shrinks the horizontal reach as the jump gets higher', () => {
    const from = surface(0, 100, 500);
    // Same 130px gap: fine on the flat, impossible while also climbing near max height.
    expect(canReach(from, surface(230, 330, 500))).toBe(true);
    expect(canReach(from, surface(230, 330, 415))).toBe(false);
  });
});

describe('every shipped level is playable', () => {
  it.each(LEVEL_ORDER)('%s spawns on ground and has a reachable exit', (levelId) => {
    expect(validateLevel(LEVELS[levelId])).toEqual([]);
  });

  it('ships the full ten-level campaign', () => {
    expect(LEVEL_ORDER).toHaveLength(10);
    expect(new Set(LEVEL_ORDER).size).toBe(10);
  });

  it('every level id matches its own data', () => {
    for (const id of LEVEL_ORDER) expect(LEVELS[id].id).toBe(id);
  });
});

describe('difficulty ramps across the campaign', () => {
  it('the finale is meaningfully harder than the tutorial level', () => {
    expect(difficultyScore(LEVELS.level010)).toBeGreaterThan(difficultyScore(LEVELS.level001) * 2);
  });

  it('trends upward overall rather than spiking randomly', () => {
    const scores = LEVEL_ORDER.map((id) => difficultyScore(LEVELS[id]));
    const firstHalf = scores.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    const secondHalf = scores.slice(5).reduce((a, b) => a + b, 0) / 5;
    expect(secondHalf).toBeGreaterThan(firstHalf);
  });

  it('never makes the next level easier by more than a small dip', () => {
    // Small dips are fine (a breather level), cliffs are not.
    const scores = LEVEL_ORDER.map((id) => difficultyScore(LEVELS[id]));
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThan(scores[i - 1] * 0.75);
    }
  });

  it('level 1 stays gentle enough to teach on', () => {
    expect(LEVELS.level001.enemies.length).toBeLessThanOrEqual(2);
    expect(difficultyScore(LEVELS.level001)).toBeLessThan(difficultyScore(LEVELS.level005));
  });
});

describe('the reach model matches the engine physics', () => {
  it('mirrors the real jump constants', () => {
    expect(JUMP_LIMITS.jumpVelocity).toBe(560);
    expect(JUMP_LIMITS.gravity).toBe(1400);
    expect(JUMP_LIMITS.runSpeed).toBe(220);
  });

  it('leaves margin so no level demands a frame-perfect maximum jump', () => {
    expect(JUMP_LIMITS.safetyFactor).toBeLessThan(1);
  });
});

describe('trophy / locked-door rules', () => {
  it('every level has a trophy, since the exit cannot open without one', () => {
    for (const id of LEVEL_ORDER) {
      expect(LEVELS[id].trophy, `${id} is missing a trophy`).toBeDefined();
    }
  });

  it('every trophy is reachable — an unreachable one makes the level unwinnable', () => {
    for (const id of LEVEL_ORDER) {
      const errors = validateLevel(LEVELS[id]).filter((e) => e.includes('trophy'));
      expect(errors, `${id}: ${errors.join('; ')}`).toEqual([]);
    }
  });

  it('the trophy is not sitting on top of the exit, so it forces real traversal', () => {
    for (const id of LEVEL_ORDER) {
      const { trophy, goal } = LEVELS[id];
      expect(Math.abs(trophy.x - goal.x), `${id}: trophy is at the door`).toBeGreaterThan(200);
    }
  });

  it('introduces fire/lava from level 3 onward, per the difficulty progression', () => {
    const kinds = (id: string) => new Set(LEVELS[id].hazards.map((h) => h.kind));
    expect(kinds('level001').has('fire')).toBe(false);
    expect(kinds('level002').has('fire')).toBe(false);
    for (const id of ['level003', 'level004', 'level005']) {
      expect(kinds(id).has('fire'), `${id} should introduce fire`).toBe(true);
    }
    for (const id of ['level005', 'level007', 'level010']) {
      expect(kinds(id).has('lava'), `${id} should use lava`).toBe(true);
    }
  });
});
