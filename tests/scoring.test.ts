import { describe, it, expect } from 'vitest';
import { createScoreState, collectGem, collectSecret, computeRating, defeatEnemy, ENEMY_DEFEAT_SCORE } from '../src/utils/scoring';

describe('scoring', () => {
  it('starts at zero score and zero collected', () => {
    const state = createScoreState(6);
    expect(state.score).toBe(0);
    expect(state.collected).toBe(0);
    expect(state.total).toBe(6);
  });

  it('carries the run score into a new level attempt while collectibles start fresh', () => {
    const state = createScoreState(6, 1250);
    expect(state.score).toBe(1250);
    expect(state.collected).toBe(0);
    expect(state.total).toBe(6);
  });

  it('collecting a gem adds 10 points and increments collected', () => {
    const state = createScoreState(6);
    const next = collectGem(state);
    expect(next.score).toBe(10);
    expect(next.collected).toBe(1);
  });

  it('collecting a secret adds 100 points', () => {
    const state = createScoreState(6);
    const next = collectSecret(state);
    expect(next.score).toBe(100);
    expect(next.collected).toBe(1);
  });

  it('defeating an enemy scores points without counting toward level collectibles', () => {
    const state = createScoreState(6);
    const next = defeatEnemy(state);
    expect(next.score).toBe(ENEMY_DEFEAT_SCORE);
    // Enemies are not collectibles: the gem counter and the 100%-collection rating must be
    // unaffected, or shooting things would inflate the level rating.
    expect(next.collected).toBe(0);
    expect(next.total).toBe(6);
  });

  it('computeRating returns gold for full collection well under par time', () => {
    const state = { score: 160, collected: 6, total: 6 };
    expect(computeRating(state, 30, 75)).toBe('gold');
  });

  it('computeRating returns bronze for low collection or slow time', () => {
    const state = { score: 20, collected: 2, total: 6 };
    expect(computeRating(state, 200, 75)).toBe('bronze');
  });

  it('computeRating returns silver for a middling run', () => {
    const state = { score: 80, collected: 4, total: 6 };
    expect(computeRating(state, 80, 75)).toBe('silver');
  });
});
