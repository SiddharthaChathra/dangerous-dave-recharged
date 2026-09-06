import { describe, it, expect } from 'vitest';
import { createLivesState, applyDamage, STARTING_LIVES, type LivesState } from '../src/utils/livesReducer';

describe('livesReducer', () => {
  it('starts a new run with 3 lives', () => {
    const state = createLivesState();
    expect(state.lives).toBe(3);
    expect(state.isGameOver).toBe(false);
  });

  it('carries a run\'s remaining lives into the next level attempt instead of refilling to 3', () => {
    const state = createLivesState(1);
    expect(state.lives).toBe(1);
    expect(state.isGameOver).toBe(false);
  });

  it('decrements lives on damage while lives remain', () => {
    const state: LivesState = { lives: 3, isGameOver: false };
    const next = applyDamage(state);
    expect(next.lives).toBe(2);
    expect(next.isGameOver).toBe(false);
  });

  it('sets isGameOver when the last life is lost', () => {
    const state: LivesState = { lives: 1, isGameOver: false };
    const next = applyDamage(state);
    expect(next.lives).toBe(0);
    expect(next.isGameOver).toBe(true);
  });

  it('never goes below zero lives', () => {
    const state: LivesState = { lives: 0, isGameOver: true };
    const next = applyDamage(state);
    expect(next.lives).toBe(0);
  });

  it('STARTING_LIVES is the classic three-life arcade rule', () => {
    expect(STARTING_LIVES).toBe(3);
  });
});
