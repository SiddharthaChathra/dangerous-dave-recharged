import { describe, it, expect } from 'vitest';
import { createLivesState, applyDamage, type LivesState } from '../src/utils/livesReducer';

describe('livesReducer', () => {
  it('starts with 3 lives and no checkpoint', () => {
    const state = createLivesState();
    expect(state.lives).toBe(3);
    expect(state.checkpointId).toBeNull();
  });

  it('decrements lives on damage while lives remain', () => {
    const state: LivesState = { lives: 3, checkpointId: null, isGameOver: false };
    const next = applyDamage(state);
    expect(next.lives).toBe(2);
    expect(next.isGameOver).toBe(false);
  });

  it('sets isGameOver when the last life is lost', () => {
    const state: LivesState = { lives: 1, checkpointId: 'cp1', isGameOver: false };
    const next = applyDamage(state);
    expect(next.lives).toBe(0);
    expect(next.isGameOver).toBe(true);
  });

  it('never goes below zero lives', () => {
    const state: LivesState = { lives: 0, checkpointId: null, isGameOver: true };
    const next = applyDamage(state);
    expect(next.lives).toBe(0);
  });
});
